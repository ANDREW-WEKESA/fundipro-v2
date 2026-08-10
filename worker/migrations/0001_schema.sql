-- FundiPro D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'fundi',
  trade TEXT DEFAULT 'General',
  location TEXT DEFAULT 'Kisii Town',
  slug TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  tier_status TEXT NOT NULL DEFAULT 'active',
  status TEXT NOT NULL DEFAULT 'active',
  bio TEXT DEFAULT '',
  whatsapp TEXT,
  photo_url TEXT,
  theme TEXT DEFAULT 'light',
  views INTEGER DEFAULT 0,
  jobs_count_this_month INTEGER DEFAULT 0,
  month_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  client_name TEXT,
  sale_price REAL DEFAULT 0,
  material_cost REAL DEFAULT 0,
  labour_cost REAL DEFAULT 0,
  transport_cost REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  margin_pct REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS storefront_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cash_price REAL DEFAULT 0,
  hp_price REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  photos TEXT DEFAULT '[]',
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  fundi_id TEXT NOT NULL REFERENCES users(id),
  product_id TEXT,
  product_title TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT DEFAULT 'stock',
  payment_type TEXT DEFAULT 'cash',
  total_price REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'requested',
  notes TEXT DEFAULT '',
  placed_by TEXT DEFAULT 'customer',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tier TEXT,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  mpesa_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  quantity REAL DEFAULT 0,
  unit TEXT DEFAULT 'pieces',
  low_stock_threshold REAL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id),
  to_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  system INTEGER DEFAULT 0,
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  description TEXT DEFAULT '',
  customer_name TEXT,
  payment_method TEXT DEFAULT 'cash',
  date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  target_id TEXT,
  target_name TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
