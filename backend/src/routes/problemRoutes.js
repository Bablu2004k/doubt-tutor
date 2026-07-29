import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createProblem,
  listProblems,
  getSession,
  deleteSession,
  toggleSessionPin,
  createQuestionForProblem,
} from "../controllers/problemController.js";

const router = Router();

router.use(requireAuth);

router.post("/", upload.single("image"), createProblem);
router.get("/", listProblems);

// Literal "/session/..." routes must be declared before "/:id" so Express
// doesn't swallow "session" as an :id value.
router.get("/session/:sessionId", getSession);
router.delete("/session/:sessionId", deleteSession);
router.patch("/session/:sessionId/pin", toggleSessionPin);

router.post("/:id/questions", createQuestionForProblem);

export default router;
