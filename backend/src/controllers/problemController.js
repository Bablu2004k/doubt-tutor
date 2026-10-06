import mongoose from "mongoose";
import crypto from "crypto";
import path from "path";
import mammoth from "mammoth";
import Problem from "../models/Problem.js";
import Question from "../models/Question.js";
import { breakDownProblem, generatePracticeQuestion } from "../services/llmService.js";

// POST /api/problems  (multipart/form-data with an optional "image" file,
// or JSON body { text, subject, sessionId }).
// sessionId groups every turn of one ongoing chat together. The frontend
// sends the current chat's sessionId on every follow-up; if it's missing
// (first message of a brand-new chat) we mint one here and hand it back.
export async function createProblem(req, res, next) {
  try {
    const { text, subject = "General", sessionId: incomingSessionId } = req.body;
    const file = req.file;

    if (!text && !file) {
      return res.status(400).json({ message: "Provide either a typed problem or an image" });
    }

    const sessionId = incomingSessionId || crypto.randomUUID();

    const ext = path.extname(file?.originalname || "").toLowerCase();
    const mime = file?.mimetype || "";
    const isImage = !!file && (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].includes(ext));
    const isPdf = !!file && (mime === "application/pdf" || ext === ".pdf");
    const isDocx = !!file && ext === ".docx";

    // Plain-text style documents are read directly; docx is extracted.
    let fileText = null;
    if (file && !isImage && !isPdf) {
      if (isDocx) {
        const { value } = await mammoth.extractRawText({ buffer: file.buffer });
        fileText = value;
      } else {
        fileText = file.buffer.toString("utf-8");
      }
      if (!fileText.trim()) {
        return res.status(400).json({ message: "Couldn't read any text from that document" });
      }
    }

    // Combine whatever the user typed with the attached document text so
    // both reach the model (the typed message was previously dropped).
    const combinedText = [text, fileText].filter(Boolean).join("\n\n");

    const llmResult =
      isImage || isPdf
        ? await breakDownProblem({
            fileBase64: file.buffer.toString("base64"),
            mediaType: isPdf ? "application/pdf" : mime.startsWith("image/") ? mime : "image/jpeg",
            text,
            subject,
          })
        : await breakDownProblem({ text: combinedText, subject });

    const problem = await Problem.create({
      user: req.userId,
      sessionId,
      sourceType: isImage ? "image" : isPdf ? "document" : "text",
      rawText: isImage ? text : isPdf ? [text, `[PDF: ${file.originalname}]`].filter(Boolean).join("\n") : combinedText,
      subject,
      topic: llmResult.topic,
      problemStatement: llmResult.problemStatement,
      solution: llmResult.solution,
    });

    res.status(201).json(problem);
  } catch (err) {
    next(err);
  }
}

// GET /api/problems  - list current user's chats for the "Recent doubts"
// sidebar, one entry per chat session (not one per question/turn).
export async function listProblems(req, res, next) {
  try {
    const sessions = await Problem.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: "$sessionId",
          topic: { $first: "$topic" },
          problemStatement: { $first: "$problemStatement" },
          pinned: { $last: "$pinned" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $last: "$createdAt" },
          turns: { $sum: 1 },
        },
      },
      { $sort: { pinned: -1, updatedAt: -1 } },
    ]);

    res.json(
      sessions.map((s) => ({
        sessionId: s._id,
        topic: s.topic,
        problemStatement: s.problemStatement,
        pinned: s.pinned,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        turns: s.turns,
      }))
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/problems/session/:sessionId
// Returns every turn (question + answer) of one chat, in order, so the
// frontend can render the whole conversation instead of just one message.
export async function getSession(req, res, next) {
  try {
    const turns = await Problem.find({
      sessionId: req.params.sessionId,
      user: req.userId,
    }).sort({ createdAt: 1 });

    if (turns.length === 0) return res.status(404).json({ message: "Chat not found" });
    res.json(turns);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/problems/session/:sessionId - deletes the whole chat
export async function deleteSession(req, res, next) {
  try {
    const result = await Problem.deleteMany({
      sessionId: req.params.sessionId,
      user: req.userId,
    });
    if (result.deletedCount === 0) return res.status(404).json({ message: "Chat not found" });
    res.json({ message: "Deleted", sessionId: req.params.sessionId });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/problems/session/:sessionId/pin - pins/unpins the whole chat
export async function toggleSessionPin(req, res, next) {
  try {
    const first = await Problem.findOne({ sessionId: req.params.sessionId, user: req.userId });
    if (!first) return res.status(404).json({ message: "Chat not found" });

    const nextPinned = !first.pinned;
    await Problem.updateMany(
      { sessionId: req.params.sessionId, user: req.userId },
      { $set: { pinned: nextPinned } }
    );
    res.json({ sessionId: req.params.sessionId, pinned: nextPinned });
  } catch (err) {
    next(err);
  }
}

// POST /api/problems/:id/questions  { difficulty }
// Generates a fresh practice question tied to this specific turn's topic.
export async function createQuestionForProblem(req, res, next) {
  try {
    const problem = await Problem.findOne({ _id: req.params.id, user: req.userId });
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const { difficulty = "medium" } = req.body;

    const llmResult = await generatePracticeQuestion({
      topic: problem.topic,
      subject: problem.subject,
      context: (problem.problemStatement || "").slice(0, 600),
      difficulty,
    });

    const question = await Question.create({
      problem: problem._id,
      user: req.userId,
      topic: problem.topic,
      difficulty,
      questionText: llmResult.questionText,
      options: llmResult.options,
      correctAnswer: llmResult.correctAnswer,
      explanation: llmResult.explanation,
    });

    res.status(201).json(question);
  } catch (err) {
    next(err);
  }
}
