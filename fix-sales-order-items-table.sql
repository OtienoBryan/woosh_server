-- Add missing fields to sales_order_items table
ALTER TABLE sales_order_items 
ADD COLUMN net_price DECIMAL(15,2) DEFAULT 0 AFTER total_price,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0 AFTER net_price;

-- Update existing records to calculate net_price and tax_amount
UPDATE sales_order_items 
SET net_price = total_price - tax_amount 
WHERE net_price = 0 AND total_price > 0; 