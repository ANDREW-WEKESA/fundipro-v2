import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

export async function handlePayments(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  if (path === "/api/payments" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ payments: results });
  }

  if (path === "/api/payments" && method === "POST") {
    const { tier, amount, mpesa_ref } = await request.json();
    const id = nanoid();
    await env.DB.prepare("INSERT INTO payments (id,user_id,tier,amount,status,mpesa_ref) VALUES (?,?,?,?,?,?)").bind(id, user.id, tier, Number(amount) || 0, "success", mpesa_ref || "").run();
    await env.DB.prepare("UPDATE users SET tier = ?, tier_status = 'active' WHERE id = ?").bind(tier, user.id).run();
    return json({ ok: true }, 201);
  }

  return json({ error: "Not found." }, 404);
}
