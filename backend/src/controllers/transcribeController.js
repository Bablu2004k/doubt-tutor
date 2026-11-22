import { transcribeAudio } from "../services/llmService.js";

// POST /api/transcribe  (multipart, field "audio", WAV)
export async function transcribe(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "No audio received" });
    const text = await transcribeAudio({
      audioBase64: req.file.buffer.toString("base64"),
      mimeType: req.file.mimetype || "audio/wav",
    });
    res.json({ text });
  } catch (err) {
    next(err);
  }
}
