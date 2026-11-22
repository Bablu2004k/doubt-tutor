import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { transcribe } from "../controllers/transcribeController.js";

// Short voice clips only: 16 kHz mono WAV is ~2 MB per minute.
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);
router.post("/", audioUpload.single("audio"), transcribe);

export default router;
