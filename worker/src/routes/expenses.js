import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

const VALID_CATS = ["materials","tools","transport","rent","utilities","labour","marketing","other"];

export async function handleExpenses(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  const url = new URL(request.url);

  if (path === "/api/expenses" && method === "GET") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const cat = url.searchParams.get("category");
    let q = "SELECT * FROM expenses WHERE user_id = ?";
    const vals = [user.id];
    if (from) { q += " AND date >= ?"; vals.push(from); }
    if (to)   { q += " AND date <= ?"; vals.push(to); }
    if (cat)  { q += " AND category = ?"; vals.push(cat); }
    q += " ORDER BY date DESC, created_at DESC";
    const { results } = await env.DB.prepare(q).bind(...vals).all();
    const total = results.reduce((a, e) => a + e.amount, 0);
    return json({ expenses: results, total_amount: total });
  }

  if (path === "/api/expenses" && method === "POST") {
    const { amount, category, description, date } = await request.json();
    if (!amount) return json({ error: "Amount is required." }, 400);
    if (!VALID_CATS.includes(category)) return json({ error: "Invalid category." }, 400);
    const id = nanoid();
    const d = date || new Date().toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO expenses (id,user_id,amount,category,description,date) VALUES (?,?,?,?,?,?)").bind(id, user.id, Number(amount), category, description || "", d).run();
    const expense = await env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    return json({ expense }, 201);
  }

  const match = path.match(/^\/api\/expenses\/([^/]+)$/);
  if (match && method === "PATCH") {
    const body = await request.json();
    const fields = []; const vals = [];
    if (body.amount !== undefined)      { fields.push("amount = ?");      vals.push(Number(body.amount)); }
    if (body.category !== undefined)    { fields.push("category = ?");    vals.push(body.category); }
    if (body.description !== undefined) { fields.push("description = ?"); vals.push(body.description); }
    if (body.date !== undefined)        { fields.push("date = ?");        vals.push(body.date); }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(match[1]); vals.push(user.id);
    await env.DB.prepare(`UPDATE expenses SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();
    const expense = await env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(match[1]).first();
    return json({ expense });
  }

  if (match && method === "DELETE") {
    await env.DB.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").bind(match[1], user.id).run();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
