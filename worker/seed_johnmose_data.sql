-- Add 20 products to John Mose's storefront
INSERT INTO storefront_items (id, user_id, title, description, cash_price, hp_price, status, category, photos, created_at, updated_at) VALUES
('prod001', (SELECT id FROM users WHERE phone = '0711111111'), 'Mahogany Dining Table Set', '6-seater dining table with matching chairs, solid mahogany wood', 45000, 52000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod002', (SELECT id FROM users WHERE phone = '0711111111'), 'King Size Bed Frame', 'Elegant king size bed with headboard storage', 35000, 40000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod003', (SELECT id FROM users WHERE phone = '0711111111'), 'L-Shaped Office Desk', 'Spacious desk with cable management and drawers', 28000, 32000, 'in_progress', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod004', (SELECT id FROM users WHERE phone = '0711111111'), 'Wardrobe Cabinet', '3-door wardrobe with mirror and shelves', 38000, 44000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod005', (SELECT id FROM users WHERE phone = '0711111111'), 'TV Stand Console', 'Modern TV stand with storage compartments', 18000, 21000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod006', (SELECT id FROM users WHERE phone = '0711111111'), 'Coffee Table Set', 'Glass top coffee table with 2 side tables', 22000, 26000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod007', (SELECT id FROM users WHERE phone = '0711111111'), 'Bookshelf Unit', '5-tier bookshelf with solid wood construction', 15000, 18000, 'reserved', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod008', (SELECT id FROM users WHERE phone = '0711111111'), 'Kitchen Cabinet Set', 'Complete kitchen cabinets with countertop', 75000, 85000, 'in_progress', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod009', (SELECT id FROM users WHERE phone = '0711111111'), 'Baby Crib', 'Safe and sturdy baby crib with adjustable height', 12000, 14000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod010', (SELECT id FROM users WHERE phone = '0711111111'), 'Bar Counter Set', 'Home bar counter with 4 bar stools', 42000, 48000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod011', (SELECT id FROM users WHERE phone = '0711111111'), 'Study Desk Chair Set', 'Ergonomic study desk with matching chair', 16000, 19000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod012', (SELECT id FROM users WHERE phone = '0711111111'), 'Shoe Rack Cabinet', '4-tier shoe rack with seat on top', 9500, 11000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod013', (SELECT id FROM users WHERE phone = '0711111111'), 'Patio Furniture Set', 'Outdoor table and 4 chairs weather resistant', 32000, 37000, 'sold', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod014', (SELECT id FROM users WHERE phone = '0711111111'), 'Dressing Table Mirror', 'Elegant dressing table with large mirror', 24000, 28000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod015', (SELECT id FROM users WHERE phone = '0711111111'), 'Children Study Desk', 'Colorful study desk perfect for kids', 11000, 13000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod016', (SELECT id FROM users WHERE phone = '0711111111'), 'Office File Cabinet', '4-drawer filing cabinet with lock', 14000, 16000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod017', (SELECT id FROM users WHERE phone = '0711111111'), 'Reception Desk', 'Professional reception desk for office', 48000, 55000, 'in_progress', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod018', (SELECT id FROM users WHERE phone = '0711111111'), 'Bedside Tables Pair', 'Matching pair of bedside tables with drawers', 9500, 11000, 'available', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod019', (SELECT id FROM users WHERE phone = '0711111111'), 'Church Pew Bench', 'Solid wood church pew seating 6 people', 35000, 40000, 'sold', 'Carpentry', '[]', datetime('now'), datetime('now')),
('prod020', (SELECT id FROM users WHERE phone = '0711111111'), 'Conference Table', 'Large conference table seats 12 people', 68000, 78000, 'reserved', 'Carpentry', '[]', datetime('now'), datetime('now'));

-- Add sales records
INSERT INTO sales (id, user_id, item_name, quantity, unit_price, total_price, payment_method, customer_name, customer_phone, sale_date, notes, created_at) VALUES
('sale001', (SELECT id FROM users WHERE phone = '0711111111'), 'Mahogany Dining Table Set', 1, 45000, 45000, 'cash', 'James Kamau', '0722334455', '2026-08-10', 'Delivered to Westlands', datetime('now')),
('sale002', (SELECT id FROM users WHERE phone = '0711111111'), 'TV Stand Console', 2, 18000, 36000, 'mpesa', 'Mary Wanjiku', '0733445566', '2026-08-11', 'Bulk order discount given', datetime('now')),
('sale003', (SELECT id FROM users WHERE phone = '0711111111'), 'Coffee Table Set', 1, 22000, 22000, 'hp', 'Peter Omondi', '0744556677', '2026-08-11', 'HP payment plan - 6 months', datetime('now')),
('sale004', (SELECT id FROM users WHERE phone = '0711111111'), 'Baby Crib', 3, 12000, 36000, 'cash', 'Grace Akinyi', '0755667788', '2026-08-12', 'Hospital bulk order', datetime('now')),
('sale005', (SELECT id FROM users WHERE phone = '0711111111'), 'Shoe Rack Cabinet', 2, 9500, 19000, 'mpesa', 'David Mutua', '0766778899', '2026-08-12', '', datetime('now')),
('sale006', (SELECT id FROM users WHERE phone = '0711111111'), 'Patio Furniture Set', 1, 32000, 32000, 'cash', 'Sarah Njeri', '0777889900', '2026-08-13', 'Delivered to Karen', datetime('now')),
('sale007', (SELECT id FROM users WHERE phone = '0711111111'), 'Study Desk Chair Set', 4, 16000, 64000, 'mpesa', 'St. Mary School', '0788990011', '2026-08-13', 'School furniture order', datetime('now')),
('sale008', (SELECT id FROM users WHERE phone = '0711111111'), 'Bookshelf Unit', 1, 15000, 15000, 'hp', 'John Mwangi', '0799001122', '2026-08-13', 'HP - 4 months', datetime('now')),
('sale009', (SELECT id FROM users WHERE phone = '0711111111'), 'Bedside Tables Pair', 3, 9500, 28500, 'cash', 'Hotel Paradise', '0700112233', '2026-08-14', 'Hotel rooms furniture', datetime('now')),
('sale010', (SELECT id FROM users WHERE phone = '0711111111'), 'Church Pew Bench', 5, 35000, 175000, 'mpesa', 'ACK Church', '0711223344', '2026-08-14', 'Church renovation project', datetime('now'));

-- Add orders
INSERT INTO orders (id, fundi_id, product_id, product_title, customer_name, customer_phone, order_type, payment_type, total_price, amount_paid, status, notes, placed_by, created_at) VALUES
('order001', (SELECT id FROM users WHERE phone = '0711111111'), 'prod004', 'Wardrobe Cabinet', 'Alice Njoki', '0722998877', 'stock', 'cash', 38000, 10000, 'confirmed', 'Deposit paid, balance on delivery', 'customer', datetime('now')),
('order002', (SELECT id FROM users WHERE phone = '0711111111'), 'prod007', 'Bookshelf Unit', 'Brian Kipchoge', '0733887766', 'stock', 'hp', 18000, 0, 'requested', 'Waiting for HP approval', 'customer', datetime('now')),
('order003', (SELECT id FROM users WHERE phone = '0711111111'), 'prod020', 'Conference Table', 'Tech Startup Ltd', '0744776655', 'stock', 'cash', 68000, 68000, 'completed', 'Paid in full, delivered', 'customer', datetime('now')),
('order004', (SELECT id FROM users WHERE phone = '0711111111'), NULL, 'Custom L-shaped sofa set', 'Monica Atieno', '0755665544', 'custom', 'cash', 55000, 0, 'requested', 'Customer wants burgundy fabric', 'customer', datetime('now')),
('order005', (SELECT id FROM users WHERE phone = '0711111111'), 'prod010', 'Bar Counter Set', 'Samuel Ochieng', '0766554433', 'stock', 'hp', 48000, 15000, 'confirmed', 'HP payment started', 'customer', datetime('now')),
('order006', (SELECT id FROM users WHERE phone = '0711111111'), NULL, 'King size bed with side drawers', 'Ruth Wambui', '0777443322', 'custom', 'cash', 42000, 21000, 'confirmed', '50% deposit paid', 'customer', datetime('now')),
('order007', (SELECT id FROM users WHERE phone = '0711111111'), 'prod014', 'Dressing Table Mirror', 'Faith Chebet', '0788332211', 'stock', 'cash', 24000, 0, 'requested', '', 'customer', datetime('now')),
('order008', (SELECT id FROM users WHERE phone = '0711111111'), NULL, 'Office cubicle partition 4-seater', 'Corporate Solutions', '0799221100', 'custom', 'cash', 95000, 0, 'requested', 'Need quote first', 'customer', datetime('now'));
