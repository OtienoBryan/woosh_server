-- Fix inventory_receipts table - add missing received_by column if it doesn't exist
ALTER TABLE inventory_receipts 
ADD COLUMN IF NOT EXISTS received_by INT NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_inventory_receipts_received_by 
FOREIGN KEY (received_by) REFERENCES users(id);

-- Update any existing records to have a default received_by value
UPDATE inventory_receipts SET received_by = 1 WHERE received_by IS NULL; 