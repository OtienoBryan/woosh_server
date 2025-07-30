-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  comment TEXT,
  receipt_date DATE NOT NULL,
  document_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert some sample suppliers
INSERT INTO suppliers (name, contact, email, address) VALUES
('ABC Suppliers Ltd', '+254700123456', 'info@abcsuppliers.com', 'Nairobi, Kenya'),
('XYZ Trading Co', '+254700789012', 'contact@xyztrading.co.ke', 'Mombasa, Kenya'),
('Kenya Imports Ltd', '+254700345678', 'sales@kenyaimports.com', 'Nakuru, Kenya'),
('East Africa Supplies', '+254700901234', 'info@eastafricasupplies.com', 'Kisumu, Kenya'),
('Premium Vendors Co', '+254700567890', 'contact@premiumvendors.co.ke', 'Eldoret, Kenya'); 