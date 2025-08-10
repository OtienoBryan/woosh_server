-- Migration script to update credit_notes table for multiple invoices support
-- Run this script to update existing credit_notes table

-- Step 1: Add new column for multiple invoice IDs
ALTER TABLE credit_notes 
ADD COLUMN original_invoice_ids JSON AFTER original_invoice_id;

-- Step 2: Migrate existing data from original_invoice_id to original_invoice_ids
-- Convert single invoice ID to JSON array format
UPDATE credit_notes 
SET original_invoice_ids = JSON_ARRAY(original_invoice_id) 
WHERE original_invoice_id IS NOT NULL;

-- Step 3: Drop the old single invoice ID column
ALTER TABLE credit_notes 
DROP COLUMN original_invoice_id;

-- Step 4: Update indexes
-- Drop old index
DROP INDEX idx_original_invoice_id ON credit_notes;

-- Add new index for JSON column (MySQL 5.7+ supports JSON indexes)
-- Note: This may not work on older MySQL versions
-- ALTER TABLE credit_notes ADD INDEX idx_original_invoice_ids ((CAST(original_invoice_ids AS CHAR(36))));

-- Step 5: Update foreign key constraints if needed
-- Note: JSON columns cannot have traditional foreign key constraints
-- The validation will need to be handled at the application level
