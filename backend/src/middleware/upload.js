import multer from "multer";

// Memory storage: we read the buffer, base64-encode it for the LLM vision
// call, and never need to persist the raw file to disk for the demo.
// Swap to diskStorage or an S3/Cloudinary uploader if you need to keep
// the original images around after the hackathon.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith("image/") || file.mimetype === "text/plain";
    if (!ok) {
      return cb(new Error("We can currently read photos (jpg/png) and plain text (.txt) files"));
    }
    cb(null, true);
  },
});
