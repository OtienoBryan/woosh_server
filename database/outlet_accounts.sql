-- Create outlet_accounts table
CREATE TABLE IF NOT EXISTS outlet_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert some default outlet accounts
INSERT INTO outlet_accounts (name, description) VALUES
('Cash Account', 'Cash-based outlet accounts'),
('Credit Account', 'Credit-based outlet accounts'),
('Wholesale Account', 'Wholesale outlet accounts'),
('Retail Account', 'Retail outlet accounts'),
('Corporate Account', 'Corporate outlet accounts')
ON DUPLICATE KEY UPDATE name=name;
