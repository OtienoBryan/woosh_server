-- Add status column to receipts table
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS status ENUM('draft', 'in pay', 'confirmed', 'cancelled') DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS account_id INT NULL,
ADD COLUMN IF NOT EXISTS reference VARCHAR(100) NULL;

-- Add foreign key constraint if it doesn't exist
ALTER TABLE receipts 
ADD CONSTRAINT IF NOT EXISTS fk_receipts_account_id 
FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id); 