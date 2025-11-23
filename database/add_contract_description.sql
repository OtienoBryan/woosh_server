-- Add description column to employee_contracts table
ALTER TABLE employee_contracts ADD COLUMN IF NOT EXISTS description TEXT NULL;

