import { json } from "../index.js";
import { requireAuth } from "../lib/auth.js";

export async function handleAudit(request, env, path) {
  const user = await requireAuth(request, env);
  if (!user || user.role !== "admin") return json({ error: "Forbidden." }, 403);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;
  const { results } = await env.DB.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(limit, offset).all();
  const total = (await env.DB.prepare("SELECT COUNT(*) as n FROM audit_logs").first()).n;
  return json({ logs: results, total, page, pages: Math.ceil(total / limit) });
}
