import { json } from "../index.js";
import { requireAuth, nanoid, hashPassword } from "../lib/auth.js";

export async function handleAdmin(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user || user.role !== "admin") return json({ error: "Forbidden." }, 403);

  // GET /api/admin/stats
  if (path === "/api/admin/stats" && method === "GET") {
    const { results: fundis } = await env.DB.prepare("SELECT tier, status FROM users WHERE role = 'fundi'").all();
    const byTier = { free: 0, pro: 0, business: 0 };
    for (const f of fundis) byTier[f.tier] = (byTier[f.tier] || 0) + 1;
    const prices = { free: 0, pro: 500, business: 1200 };
    const mrr = fundis.reduce((a, f) => a + (prices[f.tier] || 0), 0);
    const { results: payments } = await env.DB.prepare("SELECT amount FROM payments WHERE status = 'success'").all();
    const totalCollected = payments.reduce((a, p) => a + p.amount, 0);
    const openTickets = (await env.DB.prepare("SELECT COUNT(*) as n FROM tickets WHERE status = 'open'").first()).n;
    return json({ total_fundis: fundis.length, by_tier: byTier, mrr, total_collected: totalCollected, open_tickets: openTickets });
  }

  // GET /api/admin/fundis
  if (path === "/api/admin/fundis" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM users WHERE role = 'fundi' ORDER BY created_at DESC").all();
    const fundis = results.map(({ password_hash, ...u }) => u);
    return json({ fundis });
  }

  // GET /api/admin/tickets
  if (path === "/api/admin/tickets" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();
    return json({ tickets: results });
  }

  // PATCH /api/admin/tickets/:id
  const ticketMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)$/);
  if (ticketMatch && method === "PATCH") {
    const { status } = await request.json();
    await env.DB.prepare("UPDATE tickets SET status = ? WHERE id = ?").bind(status, ticketMatch[1]).run();
    return json({ ok: true });
  }

  // GET /api/admin/orders
  if (path === "/api/admin/orders" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return json({ orders: results });
  }

  // PATCH /api/admin/users/:id/status
  const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (statusMatch && method === "PATCH") {
    const { status } = await request.json();
    if (!["active","suspended","deleted"].includes(status)) return json({ error: "Invalid status." }, 400);
    await env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, statusMatch[1]).run();
    const id = nanoid();
    await env.DB.prepare("INSERT INTO audit_logs (id,event_type,actor_id,actor_name,target_id,metadata) VALUES (?,?,?,?,?,?)").bind(id, "user.status_change", user.id, user.name, statusMatch[1], JSON.stringify({ status })).run();
    return json({ ok: true });
  }

  // PATCH /api/admin/users/:id/tier
  const tierMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/tier$/);
  if (tierMatch && method === "PATCH") {
    const { tier, tier_status } = await request.json();
    const fields = []; const vals = [];
    if (tier)        { fields.push("tier = ?");        vals.push(tier); }
    if (tier_status) { fields.push("tier_status = ?"); vals.push(tier_status); }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(tierMatch[1]);
    await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    return json({ ok: true });
  }

  // PATCH /api/admin/users/:id/reset-password
  const resetMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
  if (resetMatch && method === "PATCH") {
    const { new_password } = await request.json();
    if (!new_password || new_password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);
    const hash = await hashPassword(new_password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, resetMatch[1]).run();
    const logId = nanoid();
    await env.DB.prepare("INSERT INTO audit_logs (id,event_type,actor_id,actor_name,target_id,metadata) VALUES (?,?,?,?,?,?)").bind(logId, "user.password_reset", user.id, user.name, resetMatch[1], "{}").run();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
