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

-- Create distributors_targets table
CREATE TABLE IF NOT EXISTS distributors_targets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_rep_id INT NOT NULL,
    vapes_targets INT DEFAULT 0,
    pouches_targets INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_rep_id) REFERENCES SalesRep(id) ON DELETE CASCADE
);

-- Create key_account_targets table
CREATE TABLE IF NOT EXISTS key_account_targets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_rep_id INT NOT NULL,
    vapes_targets INT DEFAULT 0,
    pouches_targets INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_rep_id) REFERENCES SalesRep(id) ON DELETE CASCADE
);

-- Create retail_targets table
CREATE TABLE IF NOT EXISTS retail_targets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_rep_id INT NOT NULL,
    vapes_targets INT DEFAULT 0,
    pouches_targets INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_rep_id) REFERENCES SalesRep(id) ON DELETE CASCADE
);

-- Insert sample managers
INSERT INTO managers (name, email, phoneNumber, country, region, managerTypeId) VALUES
('John Smith', 'john.smith@example.com', '+1234567890', 'Kenya', 'Nairobi', 1),
('Jane Doe', 'jane.doe@example.com', '+1234567891', 'Kenya', 'Mombasa', 2),
('Mike Johnson', 'mike.johnson@example.com', '+1234567892', 'Tanzania', 'Dar es Salaam', 3),
('Sarah Wilson', 'sarah.wilson@example.com', '+1234567893', 'Tanzania', 'Arusha', 1)
ON DUPLICATE KEY UPDATE name = name;

-- Insert sample targets for existing sales reps (if any exist)
-- Note: These will only be inserted if SalesRep table exists and has data
INSERT INTO distributors_targets (sales_rep_id, vapes_targets, pouches_targets, start_date, end_date)
SELECT id, 100, 50, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
FROM SalesRep 
WHERE id NOT IN (SELECT sales_rep_id FROM distributors_targets)
LIMIT 5
ON DUPLICATE KEY UPDATE vapes_targets = vapes_targets;

INSERT INTO key_account_targets (sales_rep_id, vapes_targets, pouches_targets, start_date, end_date)
SELECT id, 80, 40, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
FROM SalesRep 
WHERE id NOT IN (SELECT sales_rep_id FROM key_account_targets)
LIMIT 5
ON DUPLICATE KEY UPDATE vapes_targets = vapes_targets;

INSERT INTO retail_targets (sales_rep_id, vapes_targets, pouches_targets, start_date, end_date)
SELECT id, 60, 30, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
FROM SalesRep 
WHERE id NOT IN (SELECT sales_rep_id FROM retail_targets)
LIMIT 5
ON DUPLICATE KEY UPDATE vapes_targets = vapes_targets; 