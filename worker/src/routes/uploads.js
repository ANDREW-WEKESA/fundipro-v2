import { json } from "../index.js";
import { requireAuth } from "../lib/auth.js";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function handleUploads(request, env, path) {
  const method = request.method;

  // POST /api/uploads/photo
  // Accepts JSON: { data: "<base64>", mime: "image/jpeg" }
  // Returns: { url: "data:<mime>;base64,<data>" }
  if (path === "/api/uploads/photo" && method === "POST") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }

    const { data, mime } = body || {};
    if (!data || typeof data !== "string") return json({ error: "Missing image data." }, 400);
    if (!mime || !ALLOWED_MIME.includes(mime)) return json({ error: "Unsupported file type." }, 400);

    const approxBytes = (data.length * 3) / 4;
    if (approxBytes > MAX_SIZE_BYTES) return json({ error: "Image too large. Max 4 MB." }, 400);

    return json({ url: `data:${mime};base64,${data}` });
  }

  return json({ error: "Not found." }, 404);
}
