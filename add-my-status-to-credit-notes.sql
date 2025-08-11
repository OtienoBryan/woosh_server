-- Migration script to add my_status to credit_notes table
-- This script adds the my_status column to track credit note processing status

-- Add my_status column to credit_notes table
ALTER TABLE credit_notes ADD COLUMN my_status TINYINT DEFAULT 0;

-- my_status Values for Credit Notes:
-- 0 = Draft/New (default)
-- 1 = Processed/Received Back to Stock
-- 2 = Applied to Customer Account
-- 3 = Cancelled

-- Update existing active credit notes to have my_status = 0 (new/unprocessed)
UPDATE credit_notes 
SET my_status = 0 
WHERE status = 'active' AND my_status IS NULL;

-- Update existing applied credit notes to have my_status = 2 (applied)
UPDATE credit_notes 
SET my_status = 2 
WHERE status = 'applied' AND my_status IS NULL;

-- Update existing cancelled credit notes to have my_status = 3 (cancelled)
UPDATE credit_notes 
SET my_status = 3 
WHERE status = 'cancelled' AND my_status IS NULL;
