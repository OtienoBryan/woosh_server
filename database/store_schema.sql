-- Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_code VARCHAR(20) UNIQUE NOT NULL,
  store_name VARCHAR(100) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  manager_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert 4 default stores
INSERT INTO stores (store_code, store_name, address, phone, manager_name) VALUES
('STORE1', 'Main Branch', '123 Main Street, Downtown, City', '+1-555-1001', 'John Manager'),
('STORE2', 'Downtown Store', '456 Downtown Avenue, City Center', '+1-555-1002', 'Sarah Johnson'),
('STORE3', 'Uptown Store', '789 Uptown Boulevard, Uptown District', '+1-555-1003', 'Mike Chen'),
('STORE4', 'Warehouse Store', '101 Warehouse Road, Industrial Zone', '+1-555-1004', 'Lisa Brown');

-- Store Inventory Table (running balance per store per product)
CREATE TABLE IF NOT EXISTS store_inventory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_store_product (store_id, product_id),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Inventory Receipts Table (track what was received where and when)
CREATE TABLE IF NOT EXISTS inventory_receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_order_id INT NOT NULL,
  product_id INT NOT NULL,
  store_id INT NOT NULL,
  received_quantity INT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  received_by INT NOT NULL,
  notes TEXT,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (received_by) REFERENCES users(id)
);

-- Initialize store inventory for existing products
INSERT INTO store_inventory (store_id, product_id, quantity)
SELECT s.id, p.id, 0
FROM stores s
CROSS JOIN products p
WHERE s.is_active = true AND p.is_active = true; 