import Question from "../models/Question.js";
import Attempt from "../models/Attempt.js";

// POST /api/attempts  { questionId, submittedAnswer }
export async function submitAttempt(req, res, next) {
  try {
    const { questionId, submittedAnswer } = req.body;
    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const isCorrect =
      submittedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

    const attempt = await Attempt.create({
      user: req.userId,
      question: question._id,
      topic: question.topic,
      submittedAnswer,
      isCorrect,
    });

    res.status(201).json({ attempt, isCorrect, explanation: question.explanation });
  } catch (err) {
    next(err);
  }
}

// GET /api/attempts  - recent attempts for the current user
export async function listAttempts(req, res, next) {
  try {
    const attempts = await Attempt.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("question", "questionText topic");
    res.json(attempts);
  } catch (err) {
    next(err);
  }
}
