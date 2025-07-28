-- Create managers table
CREATE TABLE IF NOT EXISTS managers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phoneNumber VARCHAR(50),
    country VARCHAR(100),
    region VARCHAR(100),
    managerTypeId INT NOT NULL DEFAULT 1, -- 1: Retail, 2: Key Accounts, 3: Distributors
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some sample managers for testing
INSERT INTO managers (name, email, phoneNumber, country, region, managerTypeId) VALUES
('John Smith', 'john.smith@example.com', '+1234567890', 'Kenya', 'Nairobi', 1),
('Jane Doe', 'jane.doe@example.com', '+1234567891', 'Kenya', 'Mombasa', 2),
('Mike Johnson', 'mike.johnson@example.com', '+1234567892', 'Tanzania', 'Dar es Salaam', 3),
('Sarah Wilson', 'sarah.wilson@example.com', '+1234567893', 'Tanzania', 'Arusha', 1); 