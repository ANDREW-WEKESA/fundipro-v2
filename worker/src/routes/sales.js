import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

export async function handleSales(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  const url = new URL(request.url);

  if (path === "/api/sales" && method === "GET") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let q = "SELECT * FROM sales WHERE user_id = ?";
    const vals = [user.id];
    if (from) { q += " AND date >= ?"; vals.push(from); }
    if (to)   { q += " AND date <= ?"; vals.push(to); }
    q += " ORDER BY date DESC, created_at DESC";
    const { results } = await env.DB.prepare(q).bind(...vals).all();
    const total = results.reduce((a, s) => a + s.amount, 0);
    return json({ sales: results, total_amount: total });
  }

  if (path === "/api/sales" && method === "POST") {
    const { amount, description, customer_name, payment_method, date } = await request.json();
    if (!amount) return json({ error: "Amount is required." }, 400);
    const id = nanoid();
    const d = date || new Date().toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO sales (id,user_id,amount,description,customer_name,payment_method,date) VALUES (?,?,?,?,?,?,?)").bind(id, user.id, Number(amount), description || "", customer_name || "", payment_method || "cash", d).run();
    const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first();
    return json({ sale }, 201);
  }

  const match = path.match(/^\/api\/sales\/([^/]+)$/);
  if (match && method === "PATCH") {
    const id = match[1];
    const body = await request.json();
    const fields = []; const vals = [];
    if (body.amount !== undefined)         { fields.push("amount = ?");         vals.push(Number(body.amount)); }
    if (body.description !== undefined)    { fields.push("description = ?");    vals.push(body.description); }
    if (body.customer_name !== undefined)  { fields.push("customer_name = ?");  vals.push(body.customer_name); }
    if (body.payment_method !== undefined) { fields.push("payment_method = ?"); vals.push(body.payment_method); }
    if (body.date !== undefined)           { fields.push("date = ?");           vals.push(body.date); }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(match[1]); vals.push(user.id);
    await env.DB.prepare(`UPDATE sales SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();
    const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(match[1]).first();
    return json({ sale });
  }

  if (match && method === "DELETE") {
    await env.DB.prepare("DELETE FROM sales WHERE id = ? AND user_id = ?").bind(match[1], user.id).run();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
