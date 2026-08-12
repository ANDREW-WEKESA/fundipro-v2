var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/auth.js
var auth_exports = {};
__export(auth_exports, {
  hashPassword: () => hashPassword,
  nanoid: () => nanoid,
  requireAuth: () => requireAuth,
  signJwt: () => signJwt,
  verifyJwt: () => verifyJwt,
  verifyPassword: () => verifyPassword
});
function base64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64decode(str) {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}
async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(String.fromCharCode(...new Uint8Array(sig)));
}
async function signJwt(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1e3), exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 30 }));
  const sig = await hmacSign(secret, `${header}.${body}`);
  return `${header}.${body}.${sig}`;
}
async function verifyJwt(token, secret) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = await hmacSign(secret, `${header}.${body}`);
    if (sig !== expected) return null;
    const payload = JSON.parse(b64decode(body));
    if (payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
async function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const payload = await verifyJwt(token, env.JWT_SECRET || "fundipro-dev-secret");
  if (!payload) return null;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.sub).first();
  if (!user || user.status === "suspended" || user.status === "deleted") return null;
  return user;
}
async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" },
    key,
    256
  );
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hash}`;
}
async function verifyPassword(password, stored) {
  if (stored.startsWith("pbkdf2:")) {
    const [, saltHex, expectedHash] = stored.split(":");
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" },
      key,
      256
    );
    const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return hash === expectedHash;
  }
  return false;
}
function nanoid(size = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}
var init_auth = __esm({
  "src/lib/auth.js"() {
    __name(base64url, "base64url");
    __name(b64decode, "b64decode");
    __name(hmacSign, "hmacSign");
    __name(signJwt, "signJwt");
    __name(verifyJwt, "verifyJwt");
    __name(requireAuth, "requireAuth");
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
    __name(nanoid, "nanoid");
  }
});

// src/routes/auth.js
init_auth();
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "fundi";
}
__name(slugify, "slugify");
async function uniqueSlug(db, name) {
  let slug = slugify(name);
  let n = 1;
  while (true) {
    const existing = await db.prepare("SELECT id FROM users WHERE slug = ?").bind(slug).first();
    if (!existing) return slug;
    slug = `${slugify(name)}-${n++}`;
  }
}
__name(uniqueSlug, "uniqueSlug");
function publicUser(u) {
  const { password_hash, ...safe } = u;
  return safe;
}
__name(publicUser, "publicUser");
async function handleAuth(request, env, path) {
  const method = request.method;
  const sub = path.replace("/api/auth", "");
  if (sub === "/signup" && method === "POST") {
    const { name, phone, password, trade, location } = await request.json();
    if (!name || !phone || !password) return json({ error: "Name, phone, and password are required." }, 400);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE phone = ?").bind(phone).first();
    if (existing) return json({ error: "An account with this phone number already exists." }, 409);
    const id = nanoid();
    const slug = await uniqueSlug(env.DB, name);
    const password_hash = await hashPassword(password);
    const monthKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    await env.DB.prepare(
      `INSERT INTO users (id,name,phone,password_hash,role,trade,location,slug,tier,tier_status,status,bio,whatsapp,month_key)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, name, phone, password_hash, "fundi", trade || "General", location || "Kisii Town", slug, "free", "active", "active", "", phone, monthKey).run();
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    const token = await signJwt({ sub: id, role: "fundi" }, env.JWT_SECRET || "fundipro-dev-secret");
    return json({ token, user: publicUser(user) }, 201);
  }
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
  if (sub === "/me" && method === "GET") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    return json({ user: publicUser(user) });
  }
  return json({ error: "Not found." }, 404);
}
__name(handleAuth, "handleAuth");

// src/routes/storefront.js
init_auth();
var VALID_STATUSES = ["in_progress", "available", "reserved", "sold"];
var TIERS = { free: { storefrontPublic: false }, pro: { storefrontPublic: true }, business: { storefrontPublic: true } };
function parsePhotos(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
__name(parsePhotos, "parsePhotos");
async function handleStorefront(request, env, path) {
  const method = request.method;
  const url = new URL(request.url);
  if (path === "/api/storefront/me/items" && method === "GET") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const { results } = await env.DB.prepare("SELECT * FROM storefront_items WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ items: results.map((i) => ({ ...i, photos: parsePhotos(i.photos) })) });
  }
  if (path === "/api/storefront/me/items" && method === "POST") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const { title, description, cash_price, hp_price, photos, status } = await request.json();
    if (!title) return json({ error: "Item title is required." }, 400);
    const id = nanoid();
    const photosJson = JSON.stringify(Array.isArray(photos) ? photos.slice(0, 4) : []);
    const itemStatus = VALID_STATUSES.includes(status) ? status : "in_progress";
    await env.DB.prepare(
      `INSERT INTO storefront_items (id,user_id,title,description,cash_price,hp_price,photos,status) VALUES (?,?,?,?,?,?,?,?)`
    ).bind(id, user.id, title, description || "", Number(cash_price) || 0, Number(hp_price) || 0, photosJson, itemStatus).run();
    const item = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ?").bind(id).first();
    return json({ item: { ...item, photos: parsePhotos(item.photos) } }, 201);
  }
  const statusMatch = path.match(/^\/api\/storefront\/me\/items\/([^/]+)\/status$/);
  if (statusMatch && method === "PATCH") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const id = statusMatch[1];
    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) return json({ error: "Invalid status." }, 400);
    const completedAt = status === "available" ? (/* @__PURE__ */ new Date()).toISOString() : null;
    await env.DB.prepare("UPDATE storefront_items SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(status, completedAt, (/* @__PURE__ */ new Date()).toISOString(), id, user.id).run();
    const item = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ?").bind(id).first();
    if (!item) return json({ error: "Product not found." }, 404);
    return json({ item: { ...item, photos: parsePhotos(item.photos) } });
  }
  const patchItemMatch = path.match(/^\/api\/storefront\/me\/items\/([^/]+)$/);
  if (patchItemMatch && method === "PATCH") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const id = patchItemMatch[1];
    const body = await request.json();
    const fields = [];
    const vals = [];
    if (body.title !== void 0) {
      fields.push("title = ?");
      vals.push(body.title);
    }
    if (body.description !== void 0) {
      fields.push("description = ?");
      vals.push(body.description);
    }
    if (body.cash_price !== void 0) {
      fields.push("cash_price = ?");
      vals.push(Number(body.cash_price));
    }
    if (body.hp_price !== void 0) {
      fields.push("hp_price = ?");
      vals.push(Number(body.hp_price));
    }
    if (body.photos !== void 0) {
      fields.push("photos = ?");
      vals.push(JSON.stringify(Array.isArray(body.photos) ? body.photos.slice(0, 4) : []));
    }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    fields.push("updated_at = ?");
    vals.push((/* @__PURE__ */ new Date()).toISOString());
    vals.push(id);
    vals.push(user.id);
    await env.DB.prepare(`UPDATE storefront_items SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();
    const item = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ?").bind(id).first();
    return json({ item: { ...item, photos: parsePhotos(item.photos) } });
  }
  const deleteMatch = path.match(/^\/api\/storefront\/me\/items\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const id = deleteMatch[1];
    await env.DB.prepare("DELETE FROM storefront_items WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    return json({ ok: true });
  }
  if (path === "/api/storefront/me/profile" && method === "PATCH") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const body = await request.json();
    const allowed = ["bio", "trade", "location", "whatsapp", "photo_url", "name"];
    const fields = [];
    const vals = [];
    for (const key of allowed) if (body[key] !== void 0) {
      fields.push(`${key} = ?`);
      vals.push(body[key]);
    }
    if (fields.length) {
      fields.push("updated_at = ?");
      vals.push((/* @__PURE__ */ new Date()).toISOString());
      vals.push(user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    }
    const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
    const { password_hash, ...safe } = updated;
    return json({ user: safe });
  }
  const slugMatch = path.match(/^\/api\/storefront\/([^/]+)$/);
  if (slugMatch && method === "GET") {
    const slug = slugMatch[1];
    const user = await env.DB.prepare("SELECT * FROM users WHERE slug = ?").bind(slug).first();
    if (!user) return json({ error: "This storefront does not exist." }, 404);
    const { results: items } = await env.DB.prepare("SELECT * FROM storefront_items WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    const { results: reviews } = await env.DB.prepare("SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    const avg = reviews.length ? Math.round(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length * 10) / 10 : null;
    await env.DB.prepare("UPDATE users SET views = views + 1 WHERE id = ?").bind(user.id).run();
    const tier = TIERS[user.tier] || TIERS.free;
    return json({
      profile: { id: user.id, name: user.name, slug: user.slug, trade: user.trade, location: user.location, bio: user.bio, whatsapp: user.whatsapp, photo_url: user.photo_url, verified: tier.storefrontPublic, tier: user.tier },
      items: items.map((i) => ({ ...i, photos: parsePhotos(i.photos) })),
      reviews,
      avg_rating: avg
    });
  }
  const reviewMatch = path.match(/^\/api\/storefront\/([^/]+)\/reviews$/);
  if (reviewMatch && method === "POST") {
    const slug = reviewMatch[1];
    const user = await env.DB.prepare("SELECT * FROM users WHERE slug = ?").bind(slug).first();
    if (!user) return json({ error: "Storefront not found." }, 404);
    const { reviewer_name, rating, comment } = await request.json();
    if (!reviewer_name || !rating || rating < 1 || rating > 5) return json({ error: "Name and rating 1-5 required." }, 400);
    const id = nanoid();
    await env.DB.prepare("INSERT INTO reviews (id,user_id,reviewer_name,rating,comment) VALUES (?,?,?,?,?)").bind(id, user.id, reviewer_name, Number(rating), comment || "").run();
    return json({ ok: true }, 201);
  }
  const orderMatch = path.match(/^\/api\/storefront\/([^/]+)\/orders$/);
  if (orderMatch && method === "POST") {
    const slug = orderMatch[1];
    const fundi = await env.DB.prepare("SELECT * FROM users WHERE slug = ? AND role = 'fundi'").bind(slug).first();
    if (!fundi) return json({ error: "Storefront not found." }, 404);
    const { product_id, customer_name, customer_phone, order_type, payment_type, custom_description } = await request.json();
    if (!customer_name || !customer_phone) return json({ error: "Name and phone required." }, 400);
    let product = null;
    if (product_id) {
      product = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ? AND user_id = ?").bind(product_id, fundi.id).first();
    }
    const type = order_type === "custom" ? "custom" : "stock";
    if (type === "stock" && (!product || product.status !== "available")) return json({ error: "Item not available." }, 400);
    const pType = payment_type === "hp" ? "hp" : "cash";
    const totalPrice = product ? pType === "hp" ? product.hp_price : product.cash_price : 0;
    const id = nanoid();
    await env.DB.prepare(
      `INSERT INTO orders (id,fundi_id,product_id,product_title,customer_name,customer_phone,order_type,payment_type,total_price,amount_paid,status,notes,placed_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, fundi.id, product?.id || null, product?.title || custom_description || "Custom request", customer_name, customer_phone, type, pType, totalPrice, 0, "requested", type === "custom" ? custom_description || "" : "", "customer").run();
    if (type === "stock" && product) {
      await env.DB.prepare("UPDATE storefront_items SET status = 'reserved' WHERE id = ?").bind(product.id).run();
    }
    return json({ ok: true, message: "Order sent!" }, 201);
  }
  return json({ error: "Not found." }, 404);
}
__name(handleStorefront, "handleStorefront");

// src/routes/uploads.js
init_auth();
var MAX_SIZE_BYTES = 4 * 1024 * 1024;
var ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
async function handleUploads(request, env, path) {
  const method = request.method;
  if (path === "/api/uploads/photo" && method === "POST") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }
    const { data, mime } = body || {};
    if (!data || typeof data !== "string") return json({ error: "Missing image data." }, 400);
    if (!mime || !ALLOWED_MIME.includes(mime)) return json({ error: "Unsupported file type." }, 400);
    const approxBytes = data.length * 3 / 4;
    if (approxBytes > MAX_SIZE_BYTES) return json({ error: "Image too large. Max 4 MB." }, 400);
    return json({ url: `data:${mime};base64,${data}` });
  }
  return json({ error: "Not found." }, 404);
}
__name(handleUploads, "handleUploads");

// src/routes/jobs.js
init_auth();
async function handleJobs(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  if (path === "/api/jobs" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ jobs: results });
  }
  if (path === "/api/jobs" && method === "POST") {
    const { title, client_name, sale_price, material_cost, labour_cost, transport_cost } = await request.json();
    if (!title) return json({ error: "Job title is required." }, 400);
    const sp = Number(sale_price) || 0, mc = Number(material_cost) || 0, lc = Number(labour_cost) || 0, tc = Number(transport_cost) || 0;
    const profit = sp - mc - lc - tc;
    const margin_pct = sp > 0 ? Math.round(profit / sp * 1e3) / 10 : 0;
    const id = nanoid();
    await env.DB.prepare(
      `INSERT INTO jobs (id,user_id,title,client_name,sale_price,material_cost,labour_cost,transport_cost,profit,margin_pct) VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, user.id, title, client_name || "", sp, mc, lc, tc, profit, margin_pct).run();
    const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    return json({ job }, 201);
  }
  const patchMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (patchMatch && method === "PATCH") {
    const id = patchMatch[1];
    const body = await request.json();
    const sp = Number(body.sale_price) || 0, mc = Number(body.material_cost) || 0, lc = Number(body.labour_cost) || 0, tc = Number(body.transport_cost) || 0;
    const profit = sp - mc - lc - tc;
    const margin_pct = sp > 0 ? Math.round(profit / sp * 1e3) / 10 : 0;
    await env.DB.prepare(
      `UPDATE jobs SET title=?,client_name=?,sale_price=?,material_cost=?,labour_cost=?,transport_cost=?,profit=?,margin_pct=? WHERE id=? AND user_id=?`
    ).bind(body.title, body.client_name || "", sp, mc, lc, tc, profit, margin_pct, id, user.id).run();
    const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(id).first();
    return json({ job });
  }
  const deleteMatch = path.match(/^\/api\/jobs\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    await env.DB.prepare("DELETE FROM jobs WHERE id = ? AND user_id = ?").bind(deleteMatch[1], user.id).run();
    return json({ ok: true });
  }
  return json({ error: "Not found." }, 404);
}
__name(handleJobs, "handleJobs");

// src/routes/orders.js
init_auth();
async function handleOrders(request, env, path) {
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
    const fields = [];
    const vals = [];
    if (status !== void 0) {
      fields.push("status = ?");
      vals.push(status);
    }
    if (amount_paid !== void 0) {
      fields.push("amount_paid = ?");
      vals.push(Number(amount_paid));
    }
    if (notes !== void 0) {
      fields.push("notes = ?");
      vals.push(notes);
    }
    fields.push("updated_at = ?");
    vals.push((/* @__PURE__ */ new Date()).toISOString());
    vals.push(match[1]);
    vals.push(user.id);
    await env.DB.prepare(`UPDATE orders SET ${fields.join(", ")} WHERE id = ? AND fundi_id = ?`).bind(...vals).run();
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(match[1]).first();
    return json({ order });
  }
  return json({ error: "Not found." }, 404);
}
__name(handleOrders, "handleOrders");

// src/routes/materials.js
init_auth();
async function handleMaterials(request, env, path) {
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
    const fields = [];
    const vals = [];
    if (body.name !== void 0) {
      fields.push("name = ?");
      vals.push(body.name);
    }
    if (body.quantity !== void 0) {
      fields.push("quantity = ?");
      vals.push(Number(body.quantity));
    }
    if (body.unit !== void 0) {
      fields.push("unit = ?");
      vals.push(body.unit);
    }
    if (body.low_stock_threshold !== void 0) {
      fields.push("low_stock_threshold = ?");
      vals.push(Number(body.low_stock_threshold));
    }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(match[1]);
    vals.push(user.id);
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
__name(handleMaterials, "handleMaterials");

// src/routes/messages.js
init_auth();
async function handleMessages(request, env, path) {
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
    const seen = /* @__PURE__ */ new Set();
    const convos = [];
    for (const m of results) {
      const otherId = m.from_user_id === user.id ? m.to_user_id : m.from_user_id;
      if (!seen.has(otherId)) {
        seen.add(otherId);
        convos.push({ other_id: otherId, other_name: m.other_name, last_message: m.body, last_at: m.created_at, unread_count: 0 });
      }
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
__name(handleMessages, "handleMessages");

// src/routes/admin.js
init_auth();
async function handleAdmin(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user || user.role !== "admin") return json({ error: "Forbidden." }, 403);
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
  if (path === "/api/admin/fundis" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM users WHERE role = 'fundi' ORDER BY created_at DESC").all();
    const fundis = results.map(({ password_hash, ...u }) => u);
    return json({ fundis });
  }
  if (path === "/api/admin/tickets" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM tickets ORDER BY created_at DESC").all();
    return json({ tickets: results });
  }
  const ticketMatch = path.match(/^\/api\/admin\/tickets\/([^/]+)$/);
  if (ticketMatch && method === "PATCH") {
    const { status } = await request.json();
    await env.DB.prepare("UPDATE tickets SET status = ? WHERE id = ?").bind(status, ticketMatch[1]).run();
    return json({ ok: true });
  }
  if (path === "/api/admin/orders" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    return json({ orders: results });
  }
  const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (statusMatch && method === "PATCH") {
    const { status } = await request.json();
    if (!["active", "suspended", "deleted"].includes(status)) return json({ error: "Invalid status." }, 400);
    await env.DB.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, statusMatch[1]).run();
    const id = nanoid();
    await env.DB.prepare("INSERT INTO audit_logs (id,event_type,actor_id,actor_name,target_id,metadata) VALUES (?,?,?,?,?,?)").bind(id, "user.status_change", user.id, user.name, statusMatch[1], JSON.stringify({ status })).run();
    return json({ ok: true });
  }
  const tierMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/tier$/);
  if (tierMatch && method === "PATCH") {
    const { tier, tier_status } = await request.json();
    const fields = [];
    const vals = [];
    if (tier) {
      fields.push("tier = ?");
      vals.push(tier);
    }
    if (tier_status) {
      fields.push("tier_status = ?");
      vals.push(tier_status);
    }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(tierMatch[1]);
    await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    return json({ ok: true });
  }
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
__name(handleAdmin, "handleAdmin");

// src/routes/users.js
init_auth();
async function handleUsers(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  if (path === "/api/users/me" && method === "GET") {
    const { password_hash, ...safe } = user;
    return json({ user: safe });
  }
  if (path === "/api/users/me" && method === "PATCH") {
    const body = await request.json();
    const allowed = ["name", "trade", "location", "whatsapp", "bio", "photo_url", "theme"];
    const fields = [];
    const vals = [];
    for (const key of allowed) if (body[key] !== void 0) {
      fields.push(`${key} = ?`);
      vals.push(body[key]);
    }
    if (fields.length) {
      fields.push("updated_at = ?");
      vals.push((/* @__PURE__ */ new Date()).toISOString());
      vals.push(user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    }
    const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
    const { password_hash, ...safe } = updated;
    return json({ user: safe });
  }
  if (path === "/api/users/tickets" && method === "POST") {
    const { subject, message } = await request.json();
    const { nanoid: nanoid2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
    const id = nanoid2();
    await env.DB.prepare("INSERT INTO tickets (id,user_id,user_name,subject,message,status) VALUES (?,?,?,?,?,?)").bind(id, user.id, user.name, subject, message, "open").run();
    return json({ ok: true }, 201);
  }
  if (path === "/api/users/tickets" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ tickets: results });
  }
  return json({ error: "Not found." }, 404);
}
__name(handleUsers, "handleUsers");

// src/routes/sales.js
init_auth();
async function handleSales(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  const url = new URL(request.url);
  if (path === "/api/sales" && method === "GET") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let q = "SELECT * FROM sales WHERE user_id = ?";
    const vals = [user.id];
    if (from) {
      q += " AND date >= ?";
      vals.push(from);
    }
    if (to) {
      q += " AND date <= ?";
      vals.push(to);
    }
    q += " ORDER BY date DESC, created_at DESC";
    const { results } = await env.DB.prepare(q).bind(...vals).all();
    const total = results.reduce((a, s) => a + s.amount, 0);
    return json({ sales: results, total_amount: total });
  }
  if (path === "/api/sales" && method === "POST") {
    const { amount, description, customer_name, payment_method, date } = await request.json();
    if (!amount) return json({ error: "Amount is required." }, 400);
    const id = nanoid();
    const d = date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO sales (id,user_id,amount,description,customer_name,payment_method,date) VALUES (?,?,?,?,?,?,?)").bind(id, user.id, Number(amount), description || "", customer_name || "", payment_method || "cash", d).run();
    const sale = await env.DB.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first();
    return json({ sale }, 201);
  }
  const match = path.match(/^\/api\/sales\/([^/]+)$/);
  if (match && method === "PATCH") {
    const id = match[1];
    const body = await request.json();
    const fields = [];
    const vals = [];
    if (body.amount !== void 0) {
      fields.push("amount = ?");
      vals.push(Number(body.amount));
    }
    if (body.description !== void 0) {
      fields.push("description = ?");
      vals.push(body.description);
    }
    if (body.customer_name !== void 0) {
      fields.push("customer_name = ?");
      vals.push(body.customer_name);
    }
    if (body.payment_method !== void 0) {
      fields.push("payment_method = ?");
      vals.push(body.payment_method);
    }
    if (body.date !== void 0) {
      fields.push("date = ?");
      vals.push(body.date);
    }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(match[1]);
    vals.push(user.id);
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
__name(handleSales, "handleSales");

// src/routes/expenses.js
init_auth();
var VALID_CATS = ["materials", "tools", "transport", "rent", "utilities", "labour", "marketing", "other"];
async function handleExpenses(request, env, path) {
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
    if (from) {
      q += " AND date >= ?";
      vals.push(from);
    }
    if (to) {
      q += " AND date <= ?";
      vals.push(to);
    }
    if (cat) {
      q += " AND category = ?";
      vals.push(cat);
    }
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
    const d = date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    await env.DB.prepare("INSERT INTO expenses (id,user_id,amount,category,description,date) VALUES (?,?,?,?,?,?)").bind(id, user.id, Number(amount), category, description || "", d).run();
    const expense = await env.DB.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    return json({ expense }, 201);
  }
  const match = path.match(/^\/api\/expenses\/([^/]+)$/);
  if (match && method === "PATCH") {
    const body = await request.json();
    const fields = [];
    const vals = [];
    if (body.amount !== void 0) {
      fields.push("amount = ?");
      vals.push(Number(body.amount));
    }
    if (body.category !== void 0) {
      fields.push("category = ?");
      vals.push(body.category);
    }
    if (body.description !== void 0) {
      fields.push("description = ?");
      vals.push(body.description);
    }
    if (body.date !== void 0) {
      fields.push("date = ?");
      vals.push(body.date);
    }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    vals.push(match[1]);
    vals.push(user.id);
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
__name(handleExpenses, "handleExpenses");

// src/routes/reports.js
init_auth();
async function handleReports(request, env, path) {
  const method = request.method;
  const user = await requireAuth(request, env);
  if (!user) return json({ error: "Unauthorized." }, 401);
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1).toISOString().slice(0, 10);
  const to = url.searchParams.get("to") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (path === "/api/reports/profit" && method === "GET") {
    const { results: sales } = await env.DB.prepare("SELECT amount FROM sales WHERE user_id = ? AND date >= ? AND date <= ?").bind(user.id, from, to).all();
    const { results: jobs } = await env.DB.prepare("SELECT sale_price FROM jobs WHERE user_id = ? AND created_at >= ? AND created_at <= ?").bind(user.id, from + "T00:00:00", to + "T23:59:59").all();
    const { results: expenses } = await env.DB.prepare("SELECT amount, category FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?").bind(user.id, from, to).all();
    const salesIncome = sales.reduce((a, s) => a + s.amount, 0);
    const jobsIncome = jobs.reduce((a, j) => a + j.sale_price, 0);
    const totalIncome = salesIncome + jobsIncome;
    const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
    const grossProfit = totalIncome - totalExpenses;
    const marginPct = totalIncome > 0 ? Math.round(grossProfit / totalIncome * 1e3) / 10 : 0;
    const expensesByCategory = {};
    for (const e of expenses) expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
    return json({ from, to, total_income: totalIncome, total_expenses: totalExpenses, gross_profit: grossProfit, margin_pct: marginPct, income_by_source: { jobs: jobsIncome, sales: salesIncome }, expenses_by_category: expensesByCategory });
  }
  return json({ error: "Not found." }, 404);
}
__name(handleReports, "handleReports");

// src/routes/payments.js
init_auth();
async function handlePayments(request, env, path) {
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
__name(handlePayments, "handlePayments");

// src/routes/audit.js
init_auth();
async function handleAudit(request, env, path) {
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
__name(handleAudit, "handleAudit");

// src/lib/cors.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
__name(handleOptions, "handleOptions");

// src/index.js
var index_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return handleOptions(request);
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/health") {
        return json({ ok: true, name: "FundiPro API (Cloudflare Workers)" });
      }
      if (path === "/api/config") {
        return json({
          support_whatsapp: env.SUPPORT_WHATSAPP || "0107875549",
          support_email: env.SUPPORT_EMAIL || "andrewwekesa675@gmail.com",
          report_interval_days: 20
        });
      }
      if (path.startsWith("/api/uploads")) return handleUploads(request, env, path);
      if (path.startsWith("/api/auth")) return handleAuth(request, env, path);
      if (path.startsWith("/api/storefront")) return handleStorefront(request, env, path);
      if (path.startsWith("/api/jobs")) return handleJobs(request, env, path);
      if (path.startsWith("/api/orders")) return handleOrders(request, env, path);
      if (path.startsWith("/api/materials")) return handleMaterials(request, env, path);
      if (path.startsWith("/api/messages")) return handleMessages(request, env, path);
      if (path.startsWith("/api/admin/audit-logs")) return handleAudit(request, env, path);
      if (path.startsWith("/api/admin")) return handleAdmin(request, env, path);
      if (path.startsWith("/api/users")) return handleUsers(request, env, path);
      if (path.startsWith("/api/sales")) return handleSales(request, env, path);
      if (path.startsWith("/api/expenses")) return handleExpenses(request, env, path);
      if (path.startsWith("/api/reports")) return handleReports(request, env, path);
      if (path.startsWith("/api/payments")) return handlePayments(request, env, path);
      return json({ error: "Not found", path }, 404);
    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Something went wrong on our side.", details: err.message }, 500);
    }
  }
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders }
  });
}
__name(json, "json");
export {
  index_default as default,
  json
};
//# sourceMappingURL=index.js.map
