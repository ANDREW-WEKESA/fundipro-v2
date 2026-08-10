import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

export async function handleOrders(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  if (path === "/api/orders" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM orders WHERE fundi_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ orders: results });
  }

  const match = path.match(/^\/api\/orders\/([^/]+)$/);
  if (match && method === "PATCH") {
    const { status, amount_paid, notes } = await request.json();
    const fields = []; const vals = [];
    if (status !== undefined)      { fields.push("status = ?");      vals.push(status); }
    if (amount_paid !== undefined) { fields.push("amount_paid = ?"); vals.push(Number(amount_paid)); }
    if (notes !== undefined)       { fields.push("notes = ?");       vals.push(notes); }
    fields.push("updated_at = ?"); vals.push(new Date().toISOString());
    vals.push(match[1]); vals.push(user.id);
    await env.DB.prepare(`UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fundi_id = ?`).bind(...vals).run();
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(match[1]).first();
    return json({ order });
  }

  return json({ error: "Not found." }, 404);
}
