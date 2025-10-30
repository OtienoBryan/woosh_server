-- Product Category Table Schema
-- This table stores product categories with ordering

CREATE TABLE IF NOT EXISTS Category (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    orderIndex INT DEFAULT 999,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_order (orderIndex, name),
    INDEX idx_category_active (is_active)
);

-- Add category_id to products table if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_id INT NULL,
ADD INDEX IF NOT EXISTS idx_product_category (category_id);

-- Add foreign key constraint
ALTER TABLE products
ADD CONSTRAINT fk_product_category 
FOREIGN KEY (category_id) REFERENCES Category(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Insert default categories with proper ordering
INSERT INTO Category (name, description, orderIndex) VALUES
('Beverages', 'All beverage products including soft drinks, juices, water', 1),
('Food Items', 'Food products and snacks', 2),
('Dairy Products', 'Milk, yogurt, cheese and other dairy items', 3),
('Bakery', 'Bread, pastries and baked goods', 4),
('Personal Care', 'Personal hygiene and care products', 5),
('Household', 'Household cleaning and maintenance products', 6),
('Confectionery', 'Candies, chocolates and sweets', 7),
('Frozen Foods', 'Frozen and refrigerated items', 8),
('Condiments & Sauces', 'Sauces, spices and condiments', 9),
('Other', 'Miscellaneous products', 999)
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    orderIndex = VALUES(orderIndex);

