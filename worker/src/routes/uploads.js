import { json } from "../index.js";
import { requireAuth } from "../lib/auth.js";

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function handleUploads(request, env, path) {
  const method = request.method;

  // POST /api/uploads/photo
  // Accepts multipart/form-data with a "photo" field.
  // Converts the file to a base64 data URL and returns it.
  // No external storage needed — the data URL is stored directly in D1.
  if (path === "/api/uploads/photo" && method === "POST") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);

    let file;
    try {
      const formData = await request.formData();
      file = formData.get("photo");
    } catch {
      return json({ error: "Could not parse form data." }, 400);
    }

    if (!file) return json({ error: "No photo provided." }, 400);
    if (!ALLOWED_MIME.includes(file.type)) {
      return json({ error: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." }, 400);
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return json({ error: "Image too large. Max size is 4 MB." }, 400);
    }

    // Convert to base64 data URL
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const url = `data:${file.type};base64,${base64}`;

    return json({ url });
  }

  return json({ error: "Not found." }, 404);
}
