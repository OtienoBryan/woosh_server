-- Migration: Add new fields to Clients table
-- Date: 2024-12-19
-- Description: Add account_number, credit_limit, payment_terms, and other missing fields

-- Add account_number field
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS account_number VARCHAR(100) DEFAULT '';

-- Add credit_limit field
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0.00;

-- Add payment_terms field
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT '';

-- Add contact field if not exists
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS contact VARCHAR(100) DEFAULT '';

-- Add tax_pin field if not exists
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS tax_pin VARCHAR(100) DEFAULT '';

-- Add status field if not exists
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS status TINYINT DEFAULT 1;

-- Add company_name field if not exists
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS company_name VARCHAR(100) DEFAULT '';

-- Add created_at and updated_at fields if not exist
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE Clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing records to have default values
UPDATE Clients SET 
  account_number = COALESCE(account_number, ''),
  credit_limit = COALESCE(credit_limit, 0.00),
  payment_terms = COALESCE(payment_terms, ''),
  contact = COALESCE(contact, ''),
  tax_pin = COALESCE(tax_pin, ''),
  status = COALESCE(status, 1),
  company_name = COALESCE(company_name, '')
WHERE account_number IS NULL 
   OR credit_limit IS NULL 
   OR payment_terms IS NULL 
   OR contact IS NULL 
   OR tax_pin IS NULL 
   OR status IS NULL 
   OR company_name IS NULL;
