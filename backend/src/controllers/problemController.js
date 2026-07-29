import mongoose from "mongoose";
import crypto from "crypto";
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
    const { text, subject = "DSA", sessionId: incomingSessionId } = req.body;
    const file = req.file;

    if (!text && !file) {
      return res.status(400).json({ message: "Provide either a typed problem or an image" });
    }

    const sessionId = incomingSessionId || crypto.randomUUID();

    const isImage = file?.mimetype.startsWith("image/");
    const fileText = file && !isImage ? file.buffer.toString("utf-8") : null;

    const llmResult = isImage
      ? await breakDownProblem({
          imageBase64: file.buffer.toString("base64"),
          mediaType: file.mimetype,
          subject,
        })
      : await breakDownProblem({ text: fileText || text, subject });

    const problem = await Problem.create({
      user: req.userId,
      sessionId,
      sourceType: isImage ? "image" : "text",
      rawText: fileText || text,
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
