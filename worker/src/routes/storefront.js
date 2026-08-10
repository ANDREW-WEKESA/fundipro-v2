import { json } from "../index.js";
import { requireAuth, nanoid } from "../lib/auth.js";

const VALID_STATUSES = ["in_progress", "available", "reserved", "sold"];
const TIERS = { free: { storefrontPublic: false }, pro: { storefrontPublic: true }, business: { storefrontPublic: true } };

function parsePhotos(raw) {
  try { return typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []); }
  catch { return []; }
}

export async function handleStorefront(request, env, path) {
  const method = request.method;
  const url = new URL(request.url);

  // GET /api/storefront/me/items
  if (path === "/api/storefront/me/items" && method === "GET") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const { results } = await env.DB.prepare("SELECT * FROM storefront_items WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    return json({ items: results.map(i => ({ ...i, photos: parsePhotos(i.photos) })) });
  }

  // POST /api/storefront/me/items
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

  // PATCH /api/storefront/me/items/:id
  const patchItemMatch = path.match(/^\/api\/storefront\/me\/items\/([^/]+)$/);
  if (patchItemMatch && method === "PATCH") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const id = patchItemMatch[1];
    const body = await request.json();
    const fields = []; const vals = [];
    if (body.title !== undefined) { fields.push("title = ?"); vals.push(body.title); }
    if (body.description !== undefined) { fields.push("description = ?"); vals.push(body.description); }
    if (body.cash_price !== undefined) { fields.push("cash_price = ?"); vals.push(Number(body.cash_price)); }
    if (body.hp_price !== undefined) { fields.push("hp_price = ?"); vals.push(Number(body.hp_price)); }
    if (body.photos !== undefined) { fields.push("photos = ?"); vals.push(JSON.stringify(Array.isArray(body.photos) ? body.photos.slice(0, 4) : [])); }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    fields.push("updated_at = ?"); vals.push(new Date().toISOString());
    vals.push(id); vals.push(user.id);
    await env.DB.prepare(`UPDATE storefront_items SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();
    const item = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ?").bind(id).first();
    return json({ item: { ...item, photos: parsePhotos(item.photos) } });
  }

  // PATCH /api/storefront/me/items/:id/status
  const statusMatch = path.match(/^\/api\/storefront\/me\/items\/([^/]+)\/status$/);
  if (statusMatch && method === "PATCH") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const id = statusMatch[1];
    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) return json({ error: "Invalid status." }, 400);
    const completedAt = status === "available" ? new Date().toISOString() : null;
    await env.DB.prepare("UPDATE storefront_items SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(status, completedAt, new Date().toISOString(), id, user.id).run();
    const item = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ?").bind(id).first();
    return json({ item: { ...item, photos: parsePhotos(item.photos) } });
  }

  // DELETE /api/storefront/me/items/:id
  const deleteMatch = path.match(/^\/api\/storefront\/me\/items\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const id = deleteMatch[1];
    await env.DB.prepare("DELETE FROM storefront_items WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    return json({ ok: true });
  }

  // PATCH /api/storefront/me/profile
  if (path === "/api/storefront/me/profile" && method === "PATCH") {
    const user = await requireAuth(request, env);
    if (!user) return json({ error: "Unauthorized." }, 401);
    const body = await request.json();
    const allowed = ["bio", "trade", "location", "whatsapp", "photo_url", "name"];
    const fields = []; const vals = [];
    for (const key of allowed) if (body[key] !== undefined) { fields.push(`${key} = ?`); vals.push(body[key]); }
    if (fields.length) {
      fields.push("updated_at = ?"); vals.push(new Date().toISOString());
      vals.push(user.id);
      await env.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).bind(...vals).run();
    }
    const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
    const { password_hash, ...safe } = updated;
    return json({ user: safe });
  }

  // GET /api/storefront/:slug — public storefront
  const slugMatch = path.match(/^\/api\/storefront\/([^/]+)$/);
  if (slugMatch && method === "GET") {
    const slug = slugMatch[1];
    const user = await env.DB.prepare("SELECT * FROM users WHERE slug = ?").bind(slug).first();
    if (!user) return json({ error: "This storefront does not exist." }, 404);
    const { results: items } = await env.DB.prepare("SELECT * FROM storefront_items WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    const { results: reviews } = await env.DB.prepare("SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all();
    const avg = reviews.length ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10 : null;
    await env.DB.prepare("UPDATE users SET views = views + 1 WHERE id = ?").bind(user.id).run();
    const tier = TIERS[user.tier] || TIERS.free;
    return json({
      profile: { id: user.id, name: user.name, slug: user.slug, trade: user.trade, location: user.location, bio: user.bio, whatsapp: user.whatsapp, photo_url: user.photo_url, verified: tier.storefrontPublic, tier: user.tier },
      items: items.map(i => ({ ...i, photos: parsePhotos(i.photos) })),
      reviews, avg_rating: avg,
    });
  }

  // POST /api/storefront/:slug/reviews
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

  // POST /api/storefront/:slug/orders
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
    const totalPrice = product ? (pType === "hp" ? product.hp_price : product.cash_price) : 0;
    const id = nanoid();
    await env.DB.prepare(
      `INSERT INTO orders (id,fundi_id,product_id,product_title,customer_name,customer_phone,order_type,payment_type,total_price,amount_paid,status,notes,placed_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, fundi.id, product?.id || null, product?.title || custom_description || "Custom request", customer_name, customer_phone, type, pType, totalPrice, 0, "requested", type === "custom" ? (custom_description || "") : "", "customer").run();
    if (type === "stock" && product) {
      await env.DB.prepare("UPDATE storefront_items SET status = 'reserved' WHERE id = ?").bind(product.id).run();
    }
    return json({ ok: true, message: "Order sent!" }, 201);
  }

  return json({ error: "Not found." }, 404);
}
