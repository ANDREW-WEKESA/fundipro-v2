import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB per photo
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/uploads/photo
// Body: { data: "<base64 string>", mime: "image/jpeg" }
// Returns: { url: "<data URL>" }
//
// This demo stores photos as base64 data URLs inside the JSON store.
// In production you'd swap this for an R2 / S3 signed-upload and return the CDN URL.
router.post("/photo", requireAuth, (req, res) => {
  const { data, mime } = req.body || {};

  if (!data || typeof data !== "string") {
    return res.status(400).json({ error: "Missing image data." });
  }
  if (!mime || !ALLOWED_MIME.includes(mime)) {
    return res.status(400).json({ error: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." });
  }

  // Rough byte-size check: base64 is ~4/3 of the original binary size
  const approxBytes = (data.length * 3) / 4;
  if (approxBytes > MAX_SIZE_BYTES) {
    return res.status(400).json({ error: "Image is too large. Max size is 4 MB." });
  }

  const url = `data:${mime};base64,${data}`;
  res.json({ url });
});

export default router;
