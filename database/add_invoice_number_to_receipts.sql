-- Add invoice_number column to receipts table
ALTER TABLE receipts ADD COLUMN invoice_number VARCHAR(50) NULL AFTER reference;

-- Update the comment to document the new column
-- This column stores the invoice number when a payment is recorded for a specific invoice 