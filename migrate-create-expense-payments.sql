-- Migration: Create table for recording expense payments
-- Purpose: Track payments made against expenses (supplier invoices)

CREATE TABLE IF NOT EXISTS expense_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_number VARCHAR(30) UNIQUE NOT NULL,
  expense_detail_id INT NOT NULL,
  journal_entry_id INT NOT NULL,
  supplier_id INT NOT NULL,
  payment_date DATE NOT NULL,
  currency VARCHAR(10) DEFAULT 'KES',
  payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'mobile_money') NOT NULL,
  account_id INT NOT NULL, -- Cash/Bank/MPESA account used for payment
  amount DECIMAL(15,2) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_detail_id) REFERENCES expense_details(id) ON DELETE CASCADE,
  FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (created_by) REFERENCES staff(id),
  INDEX idx_expense_detail_id (expense_detail_id),
  INDEX idx_journal_entry_id (journal_entry_id),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_payment_date (payment_date),
  INDEX idx_account_id (account_id)
);


