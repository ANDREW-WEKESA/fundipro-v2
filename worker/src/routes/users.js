import { json } from "../index.js";
import { requireAuth } from "../lib/auth.js";

export async function handleUsers(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  if (path === "/api/users/me" && method === "GET") {
    const { password_hash, ...safe } = user;
    return json({ user: safe });
  }

  if (path === "/api/users/me" && method === "PATCH") {
    const body = await request.json();
    const allowed = ["name","trade","location","whatsapp","bio","photo_url","theme"];
    const fields = []; const vals = [];
    for (const key of allowed) if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
    if (fields.length) {
      fields.push("updated_at = ?"); vals.push(new Date().toISOString());
      vals.push(user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    }
    const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
    const { password_hash, ...safe } = updated;
    return json({ user: safe });
  }

  // POST /api/users/tickets — create support ticket
  if (path === "/api/users/tickets" && method === "POST") {
    const { subject, message } = await request.json();
    const { nanoid } = await import("../lib/auth.js");
    const id = nanoid();
    await env.DB.prepare("INSERT INTO tickets (id,user_id,user_name,subject,message,status) VALUES (?,?,?,?,?,?)").bind(id, user.id, user.name, subject, message, "open").run();
    return json({ ok: true }, 201);
  }

  // GET /api/users/tickets — list own tickets
  if (path === "/api/users/tickets" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ tickets: results });
  }

  return json({ error: "Not found." }, 404);
}
