-- Drop and recreate sales table with correct schema
DROP TABLE IF EXISTS sales;

CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  customer_name TEXT,
  payment_method TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
