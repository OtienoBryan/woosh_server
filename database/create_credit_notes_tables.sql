-- Create credit_notes table
CREATE TABLE IF NOT EXISTS credit_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NOT NULL,
  credit_note_date DATE NOT NULL,
  original_invoice_ids JSON,
  reason TEXT,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status ENUM('active', 'cancelled', 'applied') DEFAULT 'active',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_credit_note_number (credit_note_number)
);

-- Create credit_note_items table
CREATE TABLE IF NOT EXISTS credit_note_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  credit_note_id INT NOT NULL,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES sales_orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_credit_note_id (credit_note_id),
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_product_id (product_id)
); 