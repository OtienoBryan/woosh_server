-- Migration script to update account_type from ENUM to INT
-- Run this script to migrate existing databases

-- First, add a temporary column
ALTER TABLE chart_of_accounts ADD COLUMN account_type_new INT;

-- Update the temporary column with numeric values
UPDATE chart_of_accounts SET account_type_new = 
  CASE 
    WHEN account_type = 'asset' THEN 1
    WHEN account_type = 'liability' THEN 2
    WHEN account_type = 'equity' THEN 13
    WHEN account_type = 'revenue' THEN 4
    WHEN account_type = 'expense' THEN 5
    ELSE 5 -- default to expense
  END;

-- Drop the old ENUM column
ALTER TABLE chart_of_accounts DROP COLUMN account_type;

-- Rename the new column to account_type
ALTER TABLE chart_of_accounts CHANGE account_type_new account_type INT NOT NULL;

-- Update depreciation accounts to use type 17
UPDATE chart_of_accounts 
SET account_type = 17 
WHERE account_code = '5700' OR account_name LIKE '%depreciation%';

-- Add index for better performance
CREATE INDEX idx_account_type ON chart_of_accounts(account_type); 