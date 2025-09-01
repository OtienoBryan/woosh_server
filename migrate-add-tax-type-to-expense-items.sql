-- Migration script to add tax_type column to expense_items table
-- Run this script to update existing databases

-- Add tax_type column to expense_items table
ALTER TABLE expense_items 
ADD COLUMN tax_type ENUM('16%', 'zero_rated', 'exempted') DEFAULT '16%' 
AFTER unit_price;

-- Update existing records to have default tax type
UPDATE expense_items 
SET tax_type = '16%' 
WHERE tax_type IS NULL;

-- Add comment to clarify the column purpose
ALTER TABLE expense_items 
MODIFY COLUMN tax_type ENUM('16%', 'zero_rated', 'exempted') DEFAULT '16%' 
COMMENT 'Tax type for this expense item';
