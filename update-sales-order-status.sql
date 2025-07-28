-- Migration script to update sales_orders status ENUM
-- This adds 'in payment' and 'paid' statuses to the existing ENUM

-- First, create a temporary column with the new ENUM values
ALTER TABLE sales_orders 
ADD COLUMN status_new ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'in payment', 'paid') DEFAULT 'draft';

-- Copy data from the old column to the new column
UPDATE sales_orders SET status_new = status;

-- Drop the old column
ALTER TABLE sales_orders DROP COLUMN status;

-- Rename the new column to status
ALTER TABLE sales_orders CHANGE status_new status ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'in payment', 'paid') DEFAULT 'draft';

-- Verify the update
SELECT DISTINCT status FROM sales_orders ORDER BY status; 