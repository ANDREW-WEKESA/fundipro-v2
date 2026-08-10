import { json } from "../index.js";
import { signJwt, hashPassword, verifyPassword, nanoid, requireAuth } from "../lib/auth.js";

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "fundi";
}

async function uniqueSlug(db, name) {
  let slug = slugify(name);
  let n = 1;
  while (true) {
    const existing = await db.prepare("SELECT id FROM users WHERE slug = ?").bind(slug).first();
    if (!existing) return slug;
    slug = `${slugify(name)}-${n++}`;
  }
}

function publicUser(u) {
  const { password_hash, ...safe } = u;
  return safe;
}

export async function handleAuth(request, env, path) {
  const method = request.method;
  const sub = path.replace("/api/auth", "");

  // POST /api/auth/signup
  if (sub === "/signup" && method === "POST") {
    const { name, phone, password, trade, location } = await request.json();
    if (!name || !phone || !password) return json({ error: "Name, phone, and password are required." }, 400);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE phone = ?").bind(phone).first();
    if (existing) return json({ error: "An account with this phone number already exists." }, 409);
    const id = nanoid();
    const slug = await uniqueSlug(env.DB, name);
    const password_hash = await hashPassword(password);
    const monthKey = new Date().toISOString().slice(0, 7);
    await env.DB.prepare(
      `INSERT INTO users (id,name,phone,password_hash,role,trade,location,slug,tier,tier_status,status,bio,whatsapp,month_key)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, name, phone, password_hash, "fundi", trade || "General", location || "Kisii Town", slug, "free", "active", "active", "", phone, monthKey).run();
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    const token = await signJwt({ sub: id, role: "fundi" }, env.JWT_SECRET || "fundipro-dev-secret");
    return json({ token, user: publicUser(user) }, 201);
  }

  // POST /api/auth/login
  if (sub === "/login" && method === "POST") {
    const { phone, password } = await request.json();
    const user = await env.DB.prepare("SELECT * FROM users WHERE phone = ?").bind(phone).first();
    if (!user) return json({ error: "Incorrect phone number or password." }, 401);
    if (user.status === "suspended") return json({ error: "This account has been suspended. Contact FundiPro support.", code: "ACCOUNT_SUSPENDED" }, 403);
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return json({ error: "Incorrect phone number or password." }, 401);
    const token = await signJwt({ sub: user.id, role: user.role }, env.JWT_SECRET || "fundipro-dev-secret");
    return json({ token, user: publicUser(user) });
  }

  // POST /api/auth/change-password
  if (sub === "/change-password" && method === "POST") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const { current_password, new_password } = await request.json();
    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) return json({ error: "Current password is incorrect." }, 401);
    if (!new_password || new_password.length < 6) return json({ error: "New password must be at least 6 characters." }, 400);
    const hash = await hashPassword(new_password);
    await env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, user.id).run();
    return json({ ok: true });
  }

  // GET /api/auth/me
  if (sub === "/me" && method === "GET") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    return json({ user: publicUser(user) });
  }

  return json({ error: "Not found." }, 404);
}
