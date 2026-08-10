import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

export async function handleMaterials(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  if (path === "/api/materials" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM materials WHERE user_id = ? ORDER BY name ASC").bind(user.id).all();
    return json({ materials: results });
  }

  if (path === "/api/materials" && method === "POST") {
    const { name, quantity, unit, low_stock_threshold } = await request.json();
    if (!name) return json({ error: "Name is required." }, 400);
    const id = nanoid();
    await env.DB.prepare("INSERT INTO materials (id,user_id,name,quantity,unit,low_stock_threshold) VALUES (?,?,?,?,?,?)").bind(id, user.id, name, Number(quantity) || 0, unit || "pieces", Number(low_stock_threshold) || 5).run();
    const mat = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(id).first();
    return json({ material: mat }, 201);
  }

  const match = path.match(/^\/api\/materials\/([^/]+)$/);
  if (match && method === "PATCH") {
    const body = await request.json();
    const fields = []; const vals = [];
    if (body.name !== undefined)                { fields.push("name = ?");                vals.push(body.name); }
    if (body.quantity !== undefined)            { fields.push("quantity = ?");            vals.push(Number(body.quantity)); }
    if (body.unit !== undefined)                { fields.push("unit = ?");                vals.push(body.unit); }
    if (body.low_stock_threshold !== undefined) { fields.push("low_stock_threshold = ?"); vals.push(Number(body.low_stock_threshold)); }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(match[1]); vals.push(user.id);
    await env.DB.prepare(`UPDATE materials SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();
    const mat = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(match[1]).first();
    return json({ material: mat });
  }

  if (match && method === "DELETE") {
    await env.DB.prepare("DELETE FROM materials WHERE id = ? AND user_id = ?").bind(match[1], user.id).run();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
