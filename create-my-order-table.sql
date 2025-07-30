-- Create my_order table based on sales_orders structure
CREATE TABLE IF NOT EXISTS my_order (
    id INT PRIMARY KEY AUTO_INCREMENT,
    so_number VARCHAR(20) UNIQUE NOT NULL,
    client_id INT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'draft',
    my_status TINYINT DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INT NOT NULL,
    rider_id INT NULL,
    assigned_at TIMESTAMP NULL,
    returned_to_stock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (rider_id) REFERENCES users(id)
);

-- Create my_order_items table based on sales_order_items structure
CREATE TABLE IF NOT EXISTS my_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    my_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    net_price DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    shipped_quantity INT DEFAULT 0,
    FOREIGN KEY (my_order_id) REFERENCES my_order(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
); 