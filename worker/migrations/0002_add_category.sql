-- Add category field to storefront_items
ALTER TABLE storefront_items ADD COLUMN category TEXT DEFAULT 'General';
