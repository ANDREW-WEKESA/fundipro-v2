// Minimal JWT implementation for Cloudflare Workers (no Node crypto)

function base64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64decode(str) {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(String.fromCharCode(...new Uint8Array(sig)));
}

export async function signJwt(payload, secret) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }));
  const sig = await hmacSign(secret, `${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export async function verifyJwt(token, secret) {
  try {
    const [header, body, sig] = token.split(".");
    const expected = await hmacSign(secret, `${header}.${body}`);
    if (sig !== expected) return null;
    const payload = JSON.parse(b64decode(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export async function requireAuth(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const payload = await verifyJwt(token, env.JWT_SECRET || "fundipro-dev-secret");
  if (!payload) return null;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.sub).first();
  if (!user || user.status === "suspended" || user.status === "deleted") return null;
  return user;
}

export async function hashPassword(password) {
  // Use Web Crypto PBKDF2 for password hashing in Workers
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
  );
  const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hash}`;
}

export async function verifyPassword(password, stored) {
  // Support both old bcrypt hashes (from Express) and new pbkdf2 hashes
  if (stored.startsWith("pbkdf2:")) {
    const [, saltHex, expectedHash] = stored.split(":");
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256
    );
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hash === expectedHash;
  }
  // bcrypt hashes from old Express server — can't verify in Workers, return false
  // Users will need to reset password once
  return false;
}

export function nanoid(size = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}
