import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { store } from "../db/store.js";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { auditLog } from "../lib/audit.js";

const router = Router();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(name) {
  const base = slugify(name) || "fundi";
  let slug = base;
  let n = 1;
  while (store.get("users", (u) => u.slug === slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function publicUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// POST /api/auth/signup
// Creates a fundi account on the Free tier by default.
router.post("/signup", (req, res) => {
  const { name, phone, password, trade, location } = req.body || {};
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Name, phone, and password are required." });
  }
  if (store.get("users", (u) => u.phone === phone)) {
    return res.status(409).json({ error: "An account with this phone number already exists." });
  }

  const user = store.insert("users", {
    name,
    phone,
    password_hash: bcrypt.hashSync(password, 10),
    role: "fundi",
    trade: trade || "General",
    location: location || "Kisii Town",
    slug: uniqueSlug(name),
    tier: "free",
    tier_status: "active",
    status: "active", // 'active' | 'suspended' — admin can suspend during a conflict
    jobs_count_this_month: 0,
    month_key: new Date().toISOString().slice(0, 7), // "2026-06"
    whatsapp: phone,
    bio: "",
    photo_url: null,
    theme: "light",
  });

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { phone, password } = req.body || {};
  const user = store.get("users", (u) => u.phone === phone);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect phone number or password." });
  }
  if (user.status === "suspended") {
    return res.status(403).json({
      error: "This account has been suspended. Please contact FundiPro support to resolve this.",
      code: "ACCOUNT_SUSPENDED",
    });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/change-password — authenticated fundi changes their own password
router.post("/change-password", requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  const full = store.get("users", (u) => u.id === req.user.id);
  if (!full || !bcrypt.compareSync(current_password, full.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters." });
  }
  store.update("users", (u) => u.id === req.user.id, { password_hash: bcrypt.hashSync(new_password, 10) });
  auditLog("user.password_changed", req.user, req.user, {});
  res.json({ ok: true });
});

export default router;
