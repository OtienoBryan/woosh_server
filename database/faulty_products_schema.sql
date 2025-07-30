-- Create faulty_products table schema
-- Create faulty_products_reports table for the main report
CREATE TABLE IF NOT EXISTS faulty_products_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    store_id INT NOT NULL,
    reported_by INT NOT NULL,
    reported_date DATE NOT NULL,
    status ENUM('Reported', 'Under Investigation', 'Being Repaired', 'Repaired', 'Replaced', 'Disposed', 'Closed') DEFAULT 'Reported',
    assigned_to INT,
    resolution_notes TEXT,
    document_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_store_id (store_id),
    INDEX idx_status (status),
    INDEX idx_reported_date (reported_date),
    INDEX idx_reported_by (reported_by),
    INDEX idx_assigned_to (assigned_to)
);

-- Create faulty_products_items table for individual products in a report
CREATE TABLE IF NOT EXISTS faulty_products_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    fault_comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (report_id) REFERENCES faulty_products_reports(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_report_id (report_id),
    INDEX idx_product_id (product_id)
);

-- Show the created table structures
DESCRIBE faulty_products_reports;
DESCRIBE faulty_products_items; 