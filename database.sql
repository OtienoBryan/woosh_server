-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create premises table
CREATE TABLE IF NOT EXISTS premises (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create service_types table
CREATE TABLE IF NOT EXISTS service_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  service_type_id INT NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  delivery_location VARCHAR(255) NOT NULL,
  pickup_date DATETIME NOT NULL,
  description TEXT,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  my_status TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  photo_url VARCHAR(255) NOT NULL,
  empl_no VARCHAR(50) NOT NULL,
  id_no VARCHAR(50) NOT NULL,
  role VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  department VARCHAR(100),
  business_email VARCHAR(255),
  department_email VARCHAR(255),
  salary DECIMAL(12,2),
  employment_type ENUM('Permanent', 'Contract'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert test user (password: test123)
INSERT INTO users (username, email, password, role) VALUES 
('test', 'test@example.com', '$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial service types
INSERT INTO service_types (name, description) VALUES 
('Standard Delivery', 'Regular delivery service with standard handling'),
('Express Delivery', 'Fast delivery service with priority handling'),
('Bulk Delivery', 'Delivery service for large or multiple items'),
('Special Handling', 'Delivery service for fragile or special items')
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial staff data
INSERT INTO staff (name, photo_url, empl_no, id_no, role) VALUES 
('John Doe', 'https://randomuser.me/api/portraits/men/1.jpg', 'EMP001', '12345678', 'Senior Developer'),
('Jane Smith', 'https://randomuser.me/api/portraits/women/1.jpg', 'EMP002', '23456789', 'Project Manager'),
('Mike Johnson', 'https://randomuser.me/api/portraits/men/2.jpg', 'EMP003', '34567890', 'UI Designer'),
('Sarah Williams', 'https://randomuser.me/api/portraits/women/2.jpg', 'EMP004', '45678901', 'QA Engineer')
ON DUPLICATE KEY UPDATE id=id;

-- Insert initial premises data
INSERT INTO premises (name, address, latitude, longitude) VALUES 
('Nairobi Office', 'Kenyatta Avenue 42, Nairobi', -1.2921, 36.8219),
('Mombasa Branch', 'Moi Avenue 15, Mombasa', -4.0435, 39.6682),
('Kisumu Center', 'Oginga Odinga Road 29, Kisumu', -0.1022, 34.7617)
ON DUPLICATE KEY UPDATE id=id;

-- Create journeyPlan table
CREATE TABLE IF NOT EXISTS journeyPlan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  premisesId INT NOT NULL,
  service_type_id INT NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NOT NULL,
  pickup_date DATETIME NOT NULL,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  date DATE,
  checkinTime TIME,
  checkoutTime TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES staff(id),
  FOREIGN KEY (premisesId) REFERENCES premises(id),
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- Insert initial roles
INSERT INTO roles (name, description) VALUES 
('Senior Developer', 'Senior software developer position'),
('Project Manager', 'Project management position'),
('UI Designer', 'User interface design position'),
('QA Engineer', 'Quality assurance position'),
('Security Guard', 'Security personnel position'),
('Supervisor', 'Team supervisor position')
ON DUPLICATE KEY UPDATE id=id;

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  checkin_time DATETIME,
  checkout_time DATETIME,
  date DATE NOT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Seed departments
INSERT INTO departments (name) VALUES
('HR'),
('Finance'),
('IT'),
('Operations'),
('Sales'),
('Marketing')
ON DUPLICATE KEY UPDATE name=name;

ALTER TABLE departments ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE staff ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description VARCHAR(255),
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Add salary and employment_type columns to existing staff table if not present
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary DECIMAL(12,2);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS employment_type ENUM('Permanent', 'Contract');

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Rooms Table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255), -- Null for private chats
  is_group BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- Chat Room Members Table
CREATE TABLE IF NOT EXISTS chat_room_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  staff_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- HR Calendar Tasks Table
CREATE TABLE IF NOT EXISTS hr_calendar_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  text VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Optionally add created_by INT for user id
);

 