import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createRoadmap,
  getRoadmap,
  listRoadmaps,
  deleteRoadmap,
  regenerateRoadmap,
  completePhase,
} from "../controllers/roadmapController.js";

const router = Router();

router.use(requireAuth);

router.post("/", createRoadmap);
router.get("/", getRoadmap);
router.get("/all", listRoadmaps);
router.patch("/:id/regenerate", regenerateRoadmap);
router.patch("/:id/phases/:order/complete", completePhase);
router.delete("/:id", deleteRoadmap);

export default router;
