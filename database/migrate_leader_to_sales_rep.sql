-- Migration script to rename leader columns to sales_rep in routes table
-- This script renames the leader_id and leader_name columns to sales_rep_id and sales_rep_name

-- First, add the new columns
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS sales_rep_id INT(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_rep_name VARCHAR(100) NOT NULL DEFAULT '';

-- Copy data from leader columns to sales_rep columns
UPDATE routes SET 
  sales_rep_id = leader_id,
  sales_rep_name = leader_name
WHERE leader_id IS NOT NULL OR leader_name IS NOT NULL;

-- Drop the old leader columns
ALTER TABLE routes 
DROP COLUMN IF EXISTS leader_id,
DROP COLUMN IF EXISTS leader_name;

-- Update foreign key constraint comment (if needed)
-- ALTER TABLE routes ADD CONSTRAINT fk_routes_sales_rep FOREIGN KEY (sales_rep_id) REFERENCES SalesRep(id);
