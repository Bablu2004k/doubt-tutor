import Roadmap from "../models/Roadmap.js";
import { generateRoadmap } from "../services/llmService.js";

// POST /api/roadmap  { goal, weeks }
export async function createRoadmap(req, res, next) {
  try {
    const { goal, weeks } = req.body;
    if (!goal || !weeks) {
      return res.status(400).json({ message: "goal and weeks are required" });
    }

    const llmResult = await generateRoadmap({ goal, weeks });

    const phases = llmResult.phases.map((p, i) => ({
      ...p,
      status: i === 0 ? "active" : "locked",
    }));

    const roadmap = await Roadmap.create({
      user: req.userId,
      goal,
      weeks,
      phases,
    });

    res.status(201).json(roadmap);
  } catch (err) {
    next(err);
  }
}

// GET /api/roadmap - current user's latest roadmap
export async function getRoadmap(req, res, next) {
  try {
    const roadmap = await Roadmap.findOne({ user: req.userId }).sort({ createdAt: -1 });
    if (!roadmap) return res.status(404).json({ message: "No roadmap yet" });
    res.json(roadmap);
  } catch (err) {
    next(err);
  }
}

// GET /api/roadmap/all - every roadmap the user has ever built, newest first.
// Powers the "switch between goals / start a new one" picker.
export async function listRoadmaps(req, res, next) {
  try {
    const roadmaps = await Roadmap.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(roadmaps);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/roadmap/:id
export async function deleteRoadmap(req, res, next) {
  try {
    const roadmap = await Roadmap.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });
    res.json({ message: "Deleted", _id: req.params.id });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/roadmap/:id/regenerate
// Rebuilds the plan, keeping completed phases as-is and regenerating
// everything after the current phase.
export async function regenerateRoadmap(req, res, next) {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.id, user: req.userId });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const llmResult = await generateRoadmap({
      goal: roadmap.goal,
      weeks: roadmap.weeks,
    });

    const doneCount = roadmap.phases.filter((p) => p.status === "done").length;
    const keptPhases = roadmap.phases.slice(0, doneCount);
    const newPhases = llmResult.phases
      .slice(doneCount)
      .map((p, i) => ({ ...p, order: doneCount + i + 1, status: i === 0 ? "active" : "locked" }));

    roadmap.phases = [...keptPhases, ...newPhases];
    roadmap.lastRegeneratedAt = new Date();
    await roadmap.save();

    res.json(roadmap);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/roadmap/:id/phases/:order/complete
export async function completePhase(req, res, next) {
  try {
    const roadmap = await Roadmap.findOne({ _id: req.params.id, user: req.userId });
    if (!roadmap) return res.status(404).json({ message: "Roadmap not found" });

    const order = Number(req.params.order);
    const phase = roadmap.phases.find((p) => p.order === order);
    if (!phase) return res.status(404).json({ message: "Phase not found" });

    phase.status = "done";
    const next = roadmap.phases.find((p) => p.order === order + 1);
    if (next) next.status = "active";

    await roadmap.save();
    res.json(roadmap);
  } catch (err) {
    next(err);
  }
}
