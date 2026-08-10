import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

export async function handleMessages(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  if (path === "/api/messages/conversations" && method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT m.*, u.name as other_name FROM messages m
       JOIN users u ON u.id = CASE WHEN m.from_user_id = ? THEN m.to_user_id ELSE m.from_user_id END
       WHERE m.from_user_id = ? OR m.to_user_id = ?
       ORDER BY m.created_at DESC`
    ).bind(user.id, user.id, user.id).all();
    const seen = new Set(); const convos = [];
    for (const m of results) {
      const otherId = m.from_user_id === user.id ? m.to_user_id : m.from_user_id;
      if (!seen.has(otherId)) { seen.add(otherId); convos.push({ other_id: otherId, other_name: m.other_name, last_message: m.body, last_at: m.created_at, unread_count: 0 }); }
    }
    return json({ conversations: convos });
  }

  const threadMatch = path.match(/^\/api\/messages\/thread\/([^/]+)$/);
  if (threadMatch && method === "GET") {
    const otherId = threadMatch[1];
    const { results } = await env.DB.prepare(
      `SELECT * FROM messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at ASC`
    ).bind(user.id, otherId, otherId, user.id).all();
    await env.DB.prepare("UPDATE messages SET read = 1 WHERE to_user_id = ? AND from_user_id = ?").bind(user.id, otherId).run();
    return json({ messages: results });
  }

  if (path === "/api/messages" && method === "POST") {
    const { to_user_id, body } = await request.json();
    if (!to_user_id || !body) return json({ error: "Recipient and message required." }, 400);
    const id = nanoid();
    await env.DB.prepare("INSERT INTO messages (id,from_user_id,to_user_id,body) VALUES (?,?,?,?)").bind(id, user.id, to_user_id, body).run();
    const msg = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(id).first();
    return json({ message: msg }, 201);
  }

  return json({ error: "Not found." }, 404);
}
