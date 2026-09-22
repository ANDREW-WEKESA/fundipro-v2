-- Add M-Pesa Till Number support for fundis to receive customer payments

ALTER TABLE users ADD COLUMN till_number TEXT DEFAULT NULL;

ALTER TABLE payments ADD COLUMN checkout_request_id TEXT DEFAULT NULL;
