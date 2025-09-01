-- Migration script to add expense_account_id column to expense_items table
-- This field is required to link each expense item to its specific expense account

-- Add the expense_account_id column
ALTER TABLE expense_items
ADD COLUMN expense_account_id INT NOT NULL DEFAULT 1
AFTER unit_price;

-- Add foreign key constraint
ALTER TABLE expense_items
ADD CONSTRAINT fk_expense_items_account
FOREIGN KEY (expense_account_id) REFERENCES chart_of_accounts(id);

-- Update existing records to use a default expense account
-- You may want to manually update these based on your business logic
UPDATE expense_items 
SET expense_account_id = (
  SELECT id FROM chart_of_accounts 
  WHERE account_type = 5 
  LIMIT 1
)
WHERE expense_account_id = 1;

-- Remove the default value after updating existing records
ALTER TABLE expense_items
ALTER COLUMN expense_account_id DROP DEFAULT;

-- Add comment to clarify the column purpose
ALTER TABLE expense_items
MODIFY COLUMN expense_account_id INT NOT NULL
COMMENT 'Expense account ID for this specific expense item';
