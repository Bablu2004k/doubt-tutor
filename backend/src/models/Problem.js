import mongoose from "mongoose";

const problemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Groups every turn of one ongoing conversation together — set once
    // when the chat starts ("New doubt") and reused for every follow-up
    // sent in that same conversation, so follow-ups don't spawn new
    // "Recent doubts" entries in the sidebar.
    sessionId: { type: String, required: true, index: true },
    sourceType: { type: String, enum: ["image", "text"], required: true },
    rawText: { type: String }, // typed-in problem, if sourceType === "text"
    imageUrl: { type: String }, // stored path/URL, if sourceType === "image"
    subject: { type: String, default: "DSA" }, // e.g. DSA, C++, OS, DBMS
    topic: { type: String, required: true }, // e.g. "Recursion - base case"
    problemStatement: { type: String, required: true }, // LLM's cleaned-up restatement
    solution: { type: String, required: true }, // full answer, flowing markdown
    pinned: { type: Boolean, default: false }, // pinned to top of "Recent doubts"
  },
  { timestamps: true }
);

export default mongoose.model("Problem", problemSchema);
