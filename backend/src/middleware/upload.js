import multer from "multer";
import path from "path";

// Memory storage: we read the buffer and either base64 it for the LLM
// (images, PDFs) or extract text from it (txt, md, docx).
const storage = multer.memoryStorage();

const ALLOWED_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif",
  ".pdf", ".txt", ".md", ".docx",
]);

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    // Browsers sometimes send an empty / generic mimetype (esp. .docx, .md,
    // phone photos), so also accept by file extension.
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = file.mimetype || "";
    const ok = mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/") || ALLOWED_EXT.has(ext);
    if (!ok) {
      const err = new Error("Unsupported file. Upload a photo (jpg/png/webp), PDF, .docx, .txt or .md");
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});
