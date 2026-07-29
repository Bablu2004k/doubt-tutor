import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { submitAttempt, listAttempts } from "../controllers/attemptController.js";

const router = Router();

router.use(requireAuth);

router.post("/", submitAttempt);
router.get("/", listAttempts);

export default router;
