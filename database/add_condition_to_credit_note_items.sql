-- Migration script to add condition and return_store_id columns to credit_note_items table
-- This allows each item to have its own condition (good/damaged) and return store

-- Add condition column to credit_note_items table
ALTER TABLE credit_note_items 
ADD COLUMN condition ENUM('good', 'damaged') NULL AFTER tax_amount;

-- Add return_store_id column to credit_note_items table
ALTER TABLE credit_note_items 
ADD COLUMN return_store_id INT NULL AFTER condition;

-- Add foreign key constraint for return_store_id
ALTER TABLE credit_note_items 
ADD CONSTRAINT fk_credit_note_items_return_store_id 
FOREIGN KEY (return_store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- Add index for better performance
ALTER TABLE credit_note_items 
ADD INDEX idx_return_store_id (return_store_id);

ALTER TABLE credit_note_items 
ADD INDEX idx_condition (condition);
