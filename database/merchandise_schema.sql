-- Merchandise Management System Database Schema

-- Merchandise Categories
CREATE TABLE merchandise_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Merchandise Items
CREATE TABLE merchandise (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES merchandise_categories(id) ON DELETE RESTRICT
);

-- Merchandise Stock Table
CREATE TABLE merchandise_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    merchandise_id INT NOT NULL,
    store_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_by INT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchandise_id) REFERENCES merchandise(id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT
);

-- Insert default categories
INSERT INTO merchandise_categories (name, description) VALUES
('T-Shirts', 'Company branded t-shirts and apparel'),
('Caps', 'Company branded caps and headwear'),
('Displays', 'Marketing displays and signage'),
('Stationery', 'Office supplies and stationery'),
('Promotional Items', 'Other promotional merchandise'),
('Uniforms', 'Employee uniforms and workwear');

-- Create indexes for better performance
CREATE INDEX idx_merchandise_category ON merchandise(category_id);
CREATE INDEX idx_merchandise_active ON merchandise(is_active);
CREATE INDEX idx_merchandise_name ON merchandise(name);
CREATE INDEX idx_merchandise_categories_active ON merchandise_categories(is_active);
CREATE INDEX idx_merchandise_stock_merchandise ON merchandise_stock(merchandise_id);
CREATE INDEX idx_merchandise_stock_active ON merchandise_stock(is_active);
CREATE INDEX idx_merchandise_stock_date ON merchandise_stock(received_date);
