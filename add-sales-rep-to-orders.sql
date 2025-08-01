-- Migration script to add sales_rep_id to sales_orders table
-- This script adds the sales_rep_id column and foreign key constraint

-- Add sales_rep_id column to sales_orders table
ALTER TABLE sales_orders ADD COLUMN sales_rep_id INT;

-- Add foreign key constraint
ALTER TABLE sales_orders ADD CONSTRAINT fk_sales_orders_sales_rep 
FOREIGN KEY (sales_rep_id) REFERENCES SalesRep(id);

-- Update existing orders to assign a default sales rep (optional)
-- This will assign the first available sales rep to existing orders
-- You can modify this logic based on your business requirements
UPDATE sales_orders 
SET sales_rep_id = (SELECT id FROM SalesRep LIMIT 1) 
WHERE sales_rep_id IS NULL; 