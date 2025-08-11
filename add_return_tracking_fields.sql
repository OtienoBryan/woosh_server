-- Add fields to track return processing in sales_orders table
-- This script adds fields to track who received products back to stock and when

-- Add received_by field to track the user ID who processed the return
ALTER TABLE sales_orders 
ADD COLUMN received_by INT NULL COMMENT 'User ID who processed the return to stock';

-- Add returned_at field to track when the return was processed
ALTER TABLE sales_orders 
ADD COLUMN returned_at TIMESTAMP NULL COMMENT 'Timestamp when products were returned to stock';

-- Add foreign key constraint to link received_by to staff table
ALTER TABLE sales_orders 
ADD CONSTRAINT fk_sales_orders_received_by 
FOREIGN KEY (received_by) REFERENCES staff(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_sales_orders_returned_at ON sales_orders(returned_at);
CREATE INDEX idx_sales_orders_received_by ON sales_orders(received_by);
