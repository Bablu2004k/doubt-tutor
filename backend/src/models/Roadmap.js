import mongoose from "mongoose";

const phaseSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    durationDays: { type: Number, required: true },
    topics: [{ type: String }],
    checkpoints: [{ type: String }],
    status: { type: String, enum: ["locked", "active", "done"], default: "locked" },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    goal: { type: String, required: true }, // e.g. "Learn DSA for placements"
    weeks: { type: Number, required: true },
    phases: [phaseSchema],
    lastRegeneratedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Roadmap", roadmapSchema);
