INSERT INTO storefront_items (id,user_id,title,description,cash_price,hp_price,status,photos,created_at) VALUES
('item001','CHtVgp1YxiOz','Mahogany dining table','Seats 6, solid mahogany.',38000,44000,'available','["\/images\/jm-dining-1.jpg","\/images\/jm-dining-2.jpg","\/images\/jm-dining-3.jpg"]','2026-01-01T00:00:00Z'),
('item002','CHtVgp1YxiOz','Bedside table (pair)','Two matching bedside tables.',9500,11000,'available','["\/images\/jm-bedside-1.jpg","\/images\/jm-bedside-2.jpg","\/images\/jm-bedside-3.jpg"]','2026-01-02T00:00:00Z'),
('item003','CHtVgp1YxiOz','L-shaped office desk','In the workshop - almost done.',27000,31000,'in_progress','["\/images\/jm-desk-1.jpg","\/images\/jm-desk-2.jpg","\/images\/jm-desk-3.jpg"]','2026-01-03T00:00:00Z'),
('item004','MiaLjmHnRyxf','Custom Ankara dress','Made to measure, 5-day turnaround.',4500,5200,'available','["\/images\/gn-ankara-1.jpg","\/images\/gn-ankara-2.jpg","\/images\/gn-ankara-3.jpg"]','2026-01-01T00:00:00Z'),
('item005','AmqtQ0tuTa31','Security gate (double leaf)','Heavy gauge steel, powder coated.',32000,37000,'available','["\/images\/po-gate-1.jpg","\/images\/po-gate-2.jpg","\/images\/po-gate-3.jpg"]','2026-01-01T00:00:00Z'),
('item006','WcITYKAG2aO6','Bridal package','Hair, makeup, and nails for the big day.',12000,14000,'available','["\/images\/mk-bridal-1.jpg","\/images\/mk-bridal-2.jpg","\/images\/mk-bridal-3.jpg"]','2026-01-01T00:00:00Z'),
('item007','X9BRMprrZmFI','Full car service','Oil, filters, plugs, and inspection.',4500,5500,'available','["\/images\/so-service-1.jpg","\/images\/so-service-2.jpg","\/images\/so-service-3.jpg"]','2026-01-01T00:00:00Z');
INSERT INTO jobs (id,user_id,title,client_name,sale_price,material_cost,labour_cost,transport_cost,profit,margin_pct,created_at) VALUES
('job001','CHtVgp1YxiOz','Wooden bed frame','Mama Risper',25000,14000,4000,800,6200,24.8,'2026-07-24T00:00:00Z'),
('job002','CHtVgp1YxiOz','Kitchen cabinet set','Mama Risper',48000,27000,9000,1500,10500,21.9,'2026-07-30T00:00:00Z'),
('job003','CHtVgp1YxiOz','Office desk','Mama Risper',15000,8000,3000,500,3500,23.3,'2026-08-05T00:00:00Z');
INSERT INTO reviews (id,user_id,reviewer_name,rating,comment,created_at) VALUES
('rev001','CHtVgp1YxiOz','Esther W.',5,'Beautiful work, delivered on time!','2026-01-01T00:00:00Z'),
('rev002','CHtVgp1YxiOz','Brian K.',4,'Good quality, slightly delayed delivery.','2026-01-02T00:00:00Z'),
('rev003','MiaLjmHnRyxf','St. Marys Academy',5,'Reliable for bulk uniform orders every term.','2026-01-01T00:00:00Z'),
('rev004','WcITYKAG2aO6','Faith N.',5,'Did my wedding look perfectly. Highly recommend!','2026-01-01T00:00:00Z');
INSERT INTO tickets (id,user_id,user_name,subject,message,status,created_at) VALUES
('tick001','AmqtQ0tuTa31','Peter Ondieki','Cannot upload job photo','The photo upload button doesnt respond on my phone.','open','2026-01-01T00:00:00Z'),
('tick002','X9BRMprrZmFI','Samuel Otieno','M-Pesa payment not reflecting','I paid for Pro but my account still shows Free.','open','2026-01-01T00:00:00Z');
