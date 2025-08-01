-- Migration script to add my_status to sales_orders table
-- This script adds the my_status column to track order approval status

-- Add my_status column to sales_orders table
ALTER TABLE sales_orders ADD COLUMN my_status TINYINT DEFAULT 0;

-- Update existing confirmed orders to have my_status = 1
UPDATE sales_orders 
SET my_status = 1 
WHERE status = 'confirmed'; 