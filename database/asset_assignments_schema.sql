-- Create asset_assignments table schema
CREATE TABLE IF NOT EXISTS asset_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    staff_id INT NOT NULL,
    assigned_date DATE NOT NULL,
    assigned_by INT NOT NULL,
    comment TEXT NULL,
    status ENUM('active', 'returned', 'lost', 'damaged') DEFAULT 'active',
    returned_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (asset_id) REFERENCES my_assets(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Indexes for better performance
    INDEX idx_asset_id (asset_id),
    INDEX idx_staff_id (staff_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_status (status),
    INDEX idx_asset_staff (asset_id, staff_id)
);

-- Insert sample data
INSERT INTO asset_assignments (asset_id, staff_id, assigned_date, assigned_by, comment, status) VALUES
(1, 1, '2024-01-20', 1, 'Assigned for development work', 'active'),
(2, 2, '2024-02-05', 1, 'Marketing team desk assignment', 'active'),
(3, 3, '2024-01-25', 1, 'Admin office printer', 'active');

-- Show the created table structure
DESCRIBE asset_assignments;
