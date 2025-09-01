-- Migration script to add amount column to expense_details table
-- This field records the total amount for the expenses

-- Add the amount column
ALTER TABLE expense_details
ADD COLUMN amount DECIMAL(15,2) NOT NULL DEFAULT 0.00
AFTER supplier_id;

-- Update existing records to calculate amount from journal_entries
UPDATE expense_details ed
JOIN journal_entries je ON ed.journal_entry_id = je.id
SET ed.amount = je.total_debit
WHERE ed.amount = 0.00;

-- Add comment to clarify the column purpose
ALTER TABLE expense_details
MODIFY COLUMN amount DECIMAL(15,2) NOT NULL DEFAULT 0.00
COMMENT 'Total amount for this expense transaction';
