import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

export async function handleJobs(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);

  // GET /api/jobs
  if (path === "/api/jobs" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ jobs: results });
  }

  // POST /api/jobs
  if (path === "/api/jobs" && method === "POST") {
    const { title, client_name, sale_price, material_cost, labour_cost, transport_cost } = await request.json();
    if (!title) return json({ error: "Job title is required." }, 400);
    const sp = Number(sale_price) || 0, mc = Number(material_cost) || 0, lc = Number(labour_cost) || 0, tc = Number(transport_cost) || 0;
    const profit = sp - mc - lc - tc;
    const margin_pct = sp > 0 ? Math.round((profit / sp) * 1000) / 10 : 0;
    const id = nanoid();
    await env.DB.prepare(
      `INSERT INTO jobs (id,user_id,title,client_name,sale_price,material_cost,labour_cost,transport_cost,profit,margin_pct) VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, user.id, title, client_name || "", sp, mc, lc, tc, profit, margin_pct).run();
    const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    return json({ job }, 201);
  }

  // PATCH /api/jobs/:id
  const patchMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (patchMatch && method === "PATCH") {
    const id = patchMatch[1];
    const body = await request.json();
    const sp = Number(body.sale_price) || 0, mc = Number(body.material_cost) || 0, lc = Number(body.labour_cost) || 0, tc = Number(body.transport_cost) || 0;
    const profit = sp - mc - lc - tc;
    const margin_pct = sp > 0 ? Math.round((profit / sp) * 1000) / 10 : 0;
    await env.DB.prepare(
      `UPDATE jobs SET title=?,client_name=?,sale_price=?,material_cost=?,labour_cost=?,transport_cost=?,profit=?,margin_pct=? WHERE id=? AND user_id=?`
    ).bind(body.title, body.client_name || "", sp, mc, lc, tc, profit, margin_pct, id, user.id).run();
    const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    return json({ job });
  }

  // DELETE /api/jobs/:id
  const deleteMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    await env.DB.prepare("DELETE FROM jobs WHERE id = ? AND user_id = ?").bind(deleteMatch[1], user.id).run();
    return json({ ok: true });
  }

  return json({ error: "Not found." }, 404);
}
