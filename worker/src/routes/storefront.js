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

  // GET /api/storefront/seed-demo - seed John Mose's demo data
  if (path === "/api/storefront/seed-demo" && method === "GET") {
    try {
      const userId = 'CHtVgp1YxiOz'; // John Mose's user_id
      
      // Delete existing data for John Mose
      try { await env.DB.prepare("DELETE FROM orders WHERE fundi_id = ?").bind(userId).run(); } catch (e) {}
      try { await env.DB.prepare("DELETE FROM sales WHERE user_id = ?").bind(userId).run(); } catch (e) {}
      await env.DB.prepare("DELETE FROM storefront_items WHERE user_id = ?").bind(userId).run();
      
      // Insert 20 products
      const products = [
        ['prod001', 'Mahogany Dining Table Set', '6-seater dining table with matching chairs, solid mahogany wood', 45000, 52000, 'available', 'Carpentry'],
        ['prod002', 'King Size Bed Frame', 'Elegant king size bed with headboard storage', 35000, 40000, 'available', 'Carpentry'],
        ['prod003', 'L-Shaped Office Desk', 'Spacious desk with cable management and drawers', 28000, 32000, 'in_progress', 'Carpentry'],
        ['prod004', 'Wardrobe Cabinet', '3-door wardrobe with mirror and shelves', 38000, 44000, 'available', 'Carpentry'],
        ['prod005', 'TV Stand Console', 'Modern TV stand with storage compartments', 18000, 21000, 'available', 'Carpentry'],
        ['prod006', 'Coffee Table Set', 'Glass top coffee table with 2 side tables', 22000, 26000, 'available', 'Carpentry'],
        ['prod007', 'Bookshelf Unit', '5-tier bookshelf with solid wood construction', 15000, 18000, 'reserved', 'Carpentry'],
        ['prod008', 'Kitchen Cabinet Set', 'Complete kitchen cabinets with countertop', 75000, 85000, 'in_progress', 'Carpentry'],
        ['prod009', 'Baby Crib', 'Safe and sturdy baby crib with adjustable height', 12000, 14000, 'available', 'Carpentry'],
        ['prod010', 'Bar Counter Set', 'Home bar counter with 4 bar stools', 42000, 48000, 'available', 'Carpentry'],
        ['prod011', 'Study Desk Chair Set', 'Ergonomic study desk with matching chair', 16000, 19000, 'available', 'Carpentry'],
        ['prod012', 'Shoe Rack Cabinet', '4-tier shoe rack with seat on top', 9500, 11000, 'available', 'Carpentry'],
        ['prod013', 'Patio Furniture Set', 'Outdoor table and 4 chairs weather resistant', 32000, 37000, 'sold', 'Carpentry'],
        ['prod014', 'Dressing Table Mirror', 'Elegant dressing table with large mirror', 24000, 28000, 'available', 'Carpentry'],
        ['prod015', 'Children Study Desk', 'Colorful study desk perfect for kids', 11000, 13000, 'available', 'Carpentry'],
        ['prod016', 'Office File Cabinet', '4-drawer filing cabinet with lock', 14000, 16000, 'available', 'Carpentry'],
        ['prod017', 'Reception Desk', 'Professional reception desk for office', 48000, 55000, 'in_progress', 'Carpentry'],
        ['prod018', 'Bedside Tables Pair', 'Matching pair of bedside tables with drawers', 9500, 11000, 'available', 'Carpentry'],
        ['prod019', 'Church Pew Bench', 'Solid wood church pew seating 6 people', 35000, 40000, 'sold', 'Carpentry'],
        ['prod020', 'Conference Table', 'Large conference table seats 12 people', 68000, 78000, 'reserved', 'Carpentry'],
      ];
      
      for (const [id, title, description, cash_price, hp_price, status, category] of products) {
        await env.DB.prepare(
          `INSERT INTO storefront_items (id, user_id, title, description, cash_price, hp_price, status, category, photos, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))`
        ).bind(id, userId, title, description, cash_price, hp_price, status, category).run();
      }
      
      // Insert 10 sales records (no foreign keys, just standalone records)
      const sales = [
        ['sale001', 'Mahogany Dining Table Set', 1, 45000, 45000, 'cash', 'James Kamau', '0722334455', '2026-08-10', 'Delivered to Westlands'],
        ['sale002', 'TV Stand Console', 2, 18000, 36000, 'mpesa', 'Mary Wanjiku', '0733445566', '2026-08-11', 'Bulk order discount given'],
        ['sale003', 'Coffee Table Set', 1, 22000, 22000, 'hp', 'Peter Omondi', '0744556677', '2026-08-11', 'HP payment plan - 6 months'],
        ['sale004', 'Baby Crib', 3, 12000, 36000, 'cash', 'Grace Akinyi', '0755667788', '2026-08-12', 'Hospital bulk order'],
        ['sale005', 'Shoe Rack Cabinet', 2, 9500, 19000, 'mpesa', 'David Mutua', '0766778899', '2026-08-12', ''],
        ['sale006', 'Patio Furniture Set', 1, 32000, 32000, 'cash', 'Sarah Njeri', '0777889900', '2026-08-13', 'Delivered to Karen'],
        ['sale007', 'Study Desk Chair Set', 4, 16000, 64000, 'mpesa', 'St. Mary School', '0788990011', '2026-08-13', 'School furniture order'],
        ['sale008', 'Bookshelf Unit', 1, 15000, 15000, 'hp', 'John Mwangi', '0799001122', '2026-08-13', 'HP - 4 months'],
        ['sale009', 'Bedside Tables Pair', 3, 9500, 28500, 'cash', 'Hotel Paradise', '0700112233', '2026-08-14', 'Hotel rooms furniture'],
        ['sale010', 'Church Pew Bench', 5, 35000, 175000, 'mpesa', 'ACK Church', '0711223344', '2026-08-14', 'Church renovation project'],
      ];
      
      for (const [id, item_name, quantity, unit_price, total_price, payment_method, customer_name, customer_phone, sale_date, notes] of sales) {
        try {
          await env.DB.prepare(
            `INSERT INTO sales (id, user_id, item_name, quantity, unit_price, total_price, payment_method, customer_name, customer_phone, sale_date, notes, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(id, userId, item_name, quantity, unit_price, total_price, payment_method, customer_name, customer_phone, sale_date, notes).run();
        } catch (e) {
          // Skip if sales table doesn't exist
        }
      }
      
      // Insert 8 orders
      const orders = [
        ['order001', null, 'Wardrobe Cabinet - Custom Order', 'Alice Njoki', '0722998877', 'custom', 'cash', 38000, 10000, 'confirmed', 'Deposit paid, balance on delivery'],
        ['order002', null, 'Bookshelf Unit - Custom', 'Brian Kipchoge', '0733887766', 'custom', 'hp', 18000, 0, 'requested', 'Waiting for HP approval'],
        ['order003', null, 'Conference Table - Large', 'Tech Startup Ltd', '0744776655', 'custom', 'cash', 68000, 68000, 'completed', 'Paid in full, delivered'],
        ['order004', null, 'Custom L-shaped sofa set', 'Monica Atieno', '0755665544', 'custom', 'cash', 55000, 0, 'requested', 'Customer wants burgundy fabric'],
        ['order005', null, 'Bar Counter Set', 'Samuel Ochieng', '0766554433', 'custom', 'hp', 48000, 15000, 'confirmed', 'HP payment started'],
        ['order006', null, 'King size bed with side drawers', 'Ruth Wambui', '0777443322', 'custom', 'cash', 42000, 21000, 'confirmed', '50% deposit paid'],
        ['order007', null, 'Dressing Table Mirror', 'Faith Chebet', '0788332211', 'custom', 'cash', 24000, 0, 'requested', ''],
        ['order008', null, 'Office cubicle partition 4-seater', 'Corporate Solutions', '0799221100', 'custom', 'cash', 95000, 0, 'requested', 'Need quote first'],
      ];
      
      for (const [id, product_id, product_title, customer_name, customer_phone, order_type, payment_type, total_price, amount_paid, status, notes] of orders) {
        try {
          await env.DB.prepare(
            `INSERT INTO orders (id, fundi_id, product_id, product_title, customer_name, customer_phone, order_type, payment_type, total_price, amount_paid, status, notes, placed_by, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'customer', datetime('now'))`
          ).bind(id, userId, product_id, product_title, customer_name, customer_phone, order_type, payment_type, total_price, amount_paid, status, notes).run();
        } catch (e) {
          // Skip if orders table doesn't exist
        }
      }
      
      return json({ success: true, message: 'Demo data seeded successfully! Added 20 products, 10 sales, and 8 orders for John Mose.' });
    } catch (error) {
      return json({ error: 'Failed to seed data: ' + error.message }, 500);
    }
  }

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
    const { title, description, cash_price, hp_price, photos, status, category } = await request.json();
    if (!title) return json({ error: "Item title is required." }, 400);
    const id = nanoid();
    const photosJson = JSON.stringify(Array.isArray(photos) ? photos.slice(0, 4) : []);
    const itemStatus = VALID_STATUSES.includes(status) ? status : "in_progress";
    const itemCategory = category || "General";
    await env.DB.prepare(
      `INSERT INTO storefront_items (id,user_id,title,description,cash_price,hp_price,photos,status,category) VALUES (?,?,?,?,?,?,?,?,?)`
    ).bind(id, user.id, title, description || "", Number(cash_price) || 0, Number(hp_price) || 0, photosJson, itemStatus, itemCategory).run();
    const item = await env.DB.prepare("SELECT * FROM storefront_items WHERE id = ?").bind(id).first();
    return json({ item: { ...item, photos: parsePhotos(item.photos) } }, 201);
  }

  // PATCH /api/storefront/me/items/:id/status  ← must be checked BEFORE the generic patch
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
    if (!item) return json({ error: "Product not found." }, 404);
    return json({ item: { ...item, photos: parsePhotos(item.photos) } });
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
    if (body.category !== undefined) { fields.push("category = ?"); vals.push(body.category); }
    if (!fields.length) return json({ error: "Nothing to update." }, 400);
    fields.push("updated_at = ?"); vals.push(new Date().toISOString());
    vals.push(id); vals.push(user.id);
    await env.DB.prepare(`UPDATE storefront_items SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();
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
