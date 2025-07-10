-- Create customer_ledger table
CREATE TABLE IF NOT EXISTS customer_ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(20) NOT NULL,
    reference_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    running_balance DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Add account_id, reference, and status columns to payments table if they don't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS account_id INT NULL,
ADD COLUMN IF NOT EXISTS reference VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS status ENUM('draft', 'in pay', 'confirmed', 'cancelled') DEFAULT 'draft';

-- Add foreign key constraint if it doesn't exist
ALTER TABLE payments 
ADD CONSTRAINT IF NOT EXISTS fk_payments_account_id 
FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id); 