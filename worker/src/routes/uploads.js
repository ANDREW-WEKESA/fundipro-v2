import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";
import { corsHeaders } from "../lib/cors.js";

export async function handleUploads(request, env, path) {
  const method = request.method;

  // POST /api/uploads/photo — upload a single photo, returns its URL
  if (path === "/api/uploads/photo" && method === "POST") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);

    const formData = await request.formData();
    const file = formData.get("photo");
    if (!file) return json({ error: "No photo provided." }, 400);

    const ext = file.type === "image/png" ? "png" : "jpg";
    const key = `photos/${user.id}/${nanoid()}.${ext}`;

    await env.PHOTOS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "image/jpeg" },
    });

    const url = `/api/uploads/photo/${key}`;
    return json({ url });
  }

  // GET /api/uploads/photo/* — serve the photo from R2
  if (path.startsWith("/api/uploads/photo/photos/") && method === "GET") {
    const key = path.replace("/api/uploads/photo/", "");
    const obj = await env.PHOTOS.get(key);
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.body, {
      headers: {
        "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        ...corsHeaders,
      },
    });
  }

  return json({ error: "Not found." }, 404);
}
