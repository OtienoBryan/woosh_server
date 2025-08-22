-- Add missing tax-related fields to sales_order_items table
-- This migration adds the fields that the frontend is trying to send

ALTER TABLE sales_order_items 
ADD COLUMN tax_type ENUM('16%', 'zero_rated', 'exempted') DEFAULT '16%' AFTER unit_price,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0.00 AFTER tax_type,
ADD COLUMN net_price DECIMAL(15,2) DEFAULT 0.00 AFTER tax_amount;

-- Update existing records to have default values
UPDATE sales_order_items 
SET tax_type = '16%', 
    tax_amount = 0.00, 
    net_price = unit_price * quantity 
WHERE tax_type IS NULL;

-- Add comments to document the new fields
ALTER TABLE sales_order_items 
MODIFY COLUMN tax_type ENUM('16%', 'zero_rated', 'exempted') DEFAULT '16%' COMMENT 'Tax type for this item',
MODIFY COLUMN tax_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Tax amount for this item',
MODIFY COLUMN net_price DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Net price (quantity * unit_price) before tax';


