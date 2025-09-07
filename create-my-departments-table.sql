-- Create my_departments table
CREATE TABLE IF NOT EXISTS my_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert sample departments
INSERT INTO my_departments (name, description) VALUES
('Human Resources', 'Human resources and personnel management'),
('Finance', 'Financial management and accounting'),
('Information Technology', 'IT services and technical support'),
('Operations', 'Business operations and logistics'),
('Sales', 'Sales and customer relations'),
('Marketing', 'Marketing and communications'),
('Customer Service', 'Customer support and service'),
('Administration', 'Administrative services'),
('Legal', 'Legal affairs and compliance'),
('Research & Development', 'Research and product development')
ON DUPLICATE KEY UPDATE name=name;

-- Add department_id column to staff table
ALTER TABLE staff ADD COLUMN department_id INT NULL AFTER department;

-- Add foreign key constraint
ALTER TABLE staff ADD CONSTRAINT fk_staff_department 
FOREIGN KEY (department_id) REFERENCES my_departments(id) ON DELETE SET NULL;

-- Migrate existing department data to use foreign keys
UPDATE staff s 
JOIN my_departments md ON s.department = md.name 
SET s.department_id = md.id 
WHERE s.department IS NOT NULL AND s.department != '';

-- Keep the old department column for now (we can drop it later if needed)
-- ALTER TABLE staff DROP COLUMN department;
