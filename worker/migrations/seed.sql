-- Seed demo data for FundiPro D1
-- Passwords: all use "fundi123" / "admin123" (pbkdf2 hashes set via wrangler after deploy)
-- We insert without foreign key issues by disabling FK checks first

PRAGMA foreign_keys = OFF;

INSERT OR IGNORE INTO users (id,name,phone,password_hash,role,trade,location,slug,tier,tier_status,status,bio,whatsapp,month_key,created_at) VALUES
('admin001','Andrew Wekesa','0710435113','SET_VIA_ADMIN','admin','Platform Admin','Kisii Town','andrew-admin','business','active','active','Founder of FundiPro.','0107875549','2026-08','2026-01-01T00:00:00.000Z'),
('fundi001','John Mose','0711111111','SET_VIA_ADMIN','fundi','Carpenter','Daraja Mbili, Kisii','john-mose','pro','active','active','Custom furniture and cabinet maker, 7 years experience.','0711111111','2026-08','2026-01-01T00:00:00.000Z'),
('fundi002','Grace Nyaboke','0722222222','SET_VIA_ADMIN','fundi','Tailor','Kisii Town Centre','grace-nyaboke','pro','active','active','Dresses, school uniforms, and alterations.','0722222222','2026-08','2026-01-01T00:00:00.000Z'),
('fundi003','Peter Ondieki','0733333333','SET_VIA_ADMIN','fundi','Welder','Mwembe, Kisii','peter-ondieki','free','active','active','Gates, grills, and metal fabrication.','0733333333','2026-08','2026-01-01T00:00:00.000Z'),
('fundi004','Mary Kerubo','0744444444','SET_VIA_ADMIN','fundi','Salon & Beauty','Kisii Market','mary-kerubo','business','active','active','Braiding, treatments, and bridal styling.','0744444444','2026-08','2026-01-01T00:00:00.000Z'),
('fundi005','Samuel Otieno','0755555555','SET_VIA_ADMIN','fundi','Mechanic','Garage Row, Kisii','samuel-otieno','free','active','active','Car and motorbike repair, 10 years on the job.','0755555555','2026-08','2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO storefront_items (id,user_id,title,description,cash_price,hp_price,status,photos,created_at) VALUES
('item001','fundi001','Mahogany dining table','Seats 6, solid mahogany.',38000,44000,'available','["/images/jm-dining-1.jpg","/images/jm-dining-2.jpg","/images/jm-dining-3.jpg"]','2026-01-01T00:00:00.000Z'),
('item002','fundi001','Bedside table (pair)','Two matching bedside tables.',9500,11000,'available','["/images/jm-bedside-1.jpg","/images/jm-bedside-2.jpg","/images/jm-bedside-3.jpg"]','2026-01-02T00:00:00.000Z'),
('item003','fundi001','L-shaped office desk','In the workshop - almost done.',27000,31000,'in_progress','["/images/jm-desk-1.jpg","/images/jm-desk-2.jpg","/images/jm-desk-3.jpg"]','2026-01-03T00:00:00.000Z'),
('item004','fundi002','Custom Ankara dress','Made to measure, 5-day turnaround.',4500,5200,'available','["/images/gn-ankara-1.jpg","/images/gn-ankara-2.jpg","/images/gn-ankara-3.jpg"]','2026-01-01T00:00:00.000Z'),
('item005','fundi003','Security gate (double leaf)','Heavy gauge steel, powder coated.',32000,37000,'available','["/images/po-gate-1.jpg","/images/po-gate-2.jpg","/images/po-gate-3.jpg"]','2026-01-01T00:00:00.000Z'),
('item006','fundi004','Bridal package','Hair, makeup, and nails for the big day.',12000,14000,'available','["/images/mk-bridal-1.jpg","/images/mk-bridal-2.jpg","/images/mk-bridal-3.jpg"]','2026-01-01T00:00:00.000Z'),
('item007','fundi005','Full car service','Oil, filters, plugs, and inspection.',4500,5500,'available','["/images/so-service-1.jpg","/images/so-service-2.jpg","/images/so-service-3.jpg"]','2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO reviews (id,user_id,reviewer_name,rating,comment,created_at) VALUES
('rev001','fundi001','Esther W.',5,'Beautiful work, delivered on time!','2026-01-01T00:00:00.000Z'),
('rev002','fundi001','Brian K.',4,'Good quality, slightly delayed delivery.','2026-01-02T00:00:00.000Z'),
('rev003','fundi002','St. Marys Academy',5,'Reliable for bulk uniform orders every term.','2026-01-01T00:00:00.000Z'),
('rev004','fundi004','Faith N.',5,'Did my wedding look perfectly. Highly recommend!','2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO jobs (id,user_id,title,client_name,sale_price,material_cost,labour_cost,transport_cost,profit,margin_pct,created_at) VALUES
('job001','fundi001','Wooden bed frame','Mama Risper',25000,14000,4000,800,6200,24.8,'2026-07-24T00:00:00.000Z'),
('job002','fundi001','Kitchen cabinet set','Mama Risper',48000,27000,9000,1500,10500,21.9,'2026-07-30T00:00:00.000Z'),
('job003','fundi001','Office desk','Mama Risper',15000,8000,3000,500,3500,23.3,'2026-08-05T00:00:00.000Z');

INSERT OR IGNORE INTO tickets (id,user_id,user_name,subject,message,status,created_at) VALUES
('tick001','fundi003','Peter Ondieki','Cannot upload job photo','The photo upload button doesnt respond on my phone.','open','2026-01-01T00:00:00.000Z'),
('tick002','fundi005','Samuel Otieno','M-Pesa payment not reflecting','I paid for Pro but my account still shows Free.','open','2026-01-01T00:00:00.000Z');

PRAGMA foreign_keys = ON;
