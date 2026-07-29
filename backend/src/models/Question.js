import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    questionText: { type: String, required: true },
    options: [{ type: String }], // empty array if it's a short-answer question
    correctAnswer: { type: String, required: true },
    explanation: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Question", questionSchema);
