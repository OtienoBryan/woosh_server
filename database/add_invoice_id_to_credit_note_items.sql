-- Migration script to add invoice_id column to credit_note_items table
-- This allows credit notes to have items from different invoices

-- Add invoice_id column to credit_note_items table
ALTER TABLE credit_note_items 
ADD COLUMN invoice_id INT NOT NULL AFTER credit_note_id;

-- Add foreign key constraint
ALTER TABLE credit_note_items 
ADD CONSTRAINT fk_credit_note_items_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES sales_orders(id);

-- Add index for better performance
ALTER TABLE credit_note_items 
ADD INDEX idx_invoice_id (invoice_id);

-- Update existing records to use the original_invoice_id from credit_notes table
-- This assumes existing credit note items all came from the same invoice as the credit note
UPDATE credit_note_items cni
JOIN credit_notes cn ON cni.credit_note_id = cn.id
SET cni.invoice_id = cn.original_invoice_id
WHERE cni.invoice_id = 0 OR cni.invoice_id IS NULL; 