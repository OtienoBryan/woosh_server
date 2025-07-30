-- Create my_assets table schema
CREATE TABLE IF NOT EXISTS my_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_code VARCHAR(50) NOT NULL UNIQUE,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    supplier_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    document_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint to suppliers table
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_asset_code (asset_code),
    INDEX idx_asset_type (asset_type),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_location (location)
);

-- Insert sample data
INSERT INTO my_assets (asset_code, asset_name, asset_type, purchase_date, location, supplier_id, price, quantity) VALUES
('AST001', 'Dell Laptop XPS 13', 'Computer Equipment', '2024-01-15', 'IT Department', 1, 1200.00, 1),
('AST002', 'Office Desk', 'Furniture', '2024-02-01', 'Marketing Department', 2, 500.00, 1),
('AST003', 'Printer HP LaserJet', 'Office Equipment', '2024-01-20', 'Admin Office', 3, 800.00, 1),
('AST004', 'Office Chairs', 'Furniture', '2024-02-10', 'Sales Department', 2, 300.00, 5),
('AST005', 'Network Switch', 'IT Equipment', '2024-01-25', 'Server Room', 1, 1500.00, 1);

-- Show the created table structure
DESCRIBE my_assets; 