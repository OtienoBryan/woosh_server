-- Migration: Add payment_journal_entry_id to expense_payments table
-- This column will store the ID of the journal entry created when confirming a payment

ALTER TABLE expense_payments 
ADD COLUMN payment_journal_entry_id INT NULL AFTER journal_entry_id,
ADD CONSTRAINT fk_expense_payments_payment_journal_entry 
FOREIGN KEY (payment_journal_entry_id) REFERENCES journal_entries(id);

-- Add index for better performance
CREATE INDEX idx_payment_journal_entry_id ON expense_payments(payment_journal_entry_id);
