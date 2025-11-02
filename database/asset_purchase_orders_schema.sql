-- Create asset purchase orders table schema
CREATE TABLE IF NOT EXISTS asset_purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    apo_number VARCHAR(20) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE NULL,
    status ENUM('draft', 'sent', 'received', 'cancelled') DEFAULT 'draft',
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    notes TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_apo_number (apo_number),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_order_date (order_date),
    INDEX idx_status (status)
);

-- Create asset purchase order items table schema
CREATE TABLE IF NOT EXISTS asset_purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_purchase_order_id INT NOT NULL,
    asset_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    tax_type ENUM('16%', 'zero_rated', 'exempted') DEFAULT '16%',
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    received_quantity INT DEFAULT 0,
    
    FOREIGN KEY (asset_purchase_order_id) REFERENCES asset_purchase_orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES my_assets(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    INDEX idx_apo_id (asset_purchase_order_id),
    INDEX idx_asset_id (asset_id)
);

-- Note: This table structure references existing assets from my_assets table.
-- The unit_price here is the purchase price for this specific order.
-- When receiving, quantity is incremented on the existing asset record.

-- Show the created table structures
DESCRIBE asset_purchase_orders;
DESCRIBE asset_purchase_order_items;

