-- =====================================================
-- Extended Staff Database Schema
-- This schema adds support for all additional staff form fields
-- =====================================================

-- =====================================================
-- 1. Add columns directly to staff table
-- =====================================================

-- Manager reference (self-referencing foreign key)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS manager_id INT NULL AFTER department_id;
ALTER TABLE staff ADD CONSTRAINT fk_staff_manager 
  FOREIGN KEY (manager_id) REFERENCES staff(id) ON DELETE SET NULL;

-- Offer Details
ALTER TABLE staff ADD COLUMN IF NOT EXISTS offer_date DATE NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS start_date DATE NULL;

-- Personal Details (additional fields)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed') NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT NULL;

-- Statutory Details
ALTER TABLE staff ADD COLUMN IF NOT EXISTS nhif_number VARCHAR(50) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS nssf_number VARCHAR(50) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS kra_pin VARCHAR(50) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50) NULL;

-- Bank Details
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS account_name VARCHAR(255) NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS swift_code VARCHAR(50) NULL;

-- Benefits (stored as JSON or separate table - using JSON for simplicity)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS benefits JSON NULL;

-- =====================================================
-- 2. Nominated Beneficiaries Table (2 entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_beneficiaries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship ENUM('Spouse', 'Child', 'Parent', 'Sibling', 'Other') NOT NULL,
  contact VARCHAR(255) NOT NULL,
  entry_order TINYINT NOT NULL DEFAULT 1, -- 1 or 2
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_beneficiary (staff_id, entry_order)
);

-- =====================================================
-- 3. Emergency Contacts Table (2 entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_emergency_contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship ENUM('Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other') NOT NULL,
  contact VARCHAR(255) NOT NULL,
  entry_order TINYINT NOT NULL DEFAULT 1, -- 1 or 2
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_emergency (staff_id, entry_order)
);

-- =====================================================
-- 4. Family Details Table (3 entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_family (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relationship ENUM('Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Child', 'Other') NOT NULL,
  contact VARCHAR(255) NOT NULL,
  entry_order TINYINT NOT NULL DEFAULT 1, -- 1, 2, or 3
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_family (staff_id, entry_order)
);

-- =====================================================
-- 5. Education Details Table (5 entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_education (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  institution VARCHAR(255) NOT NULL,
  qualification VARCHAR(255) NOT NULL,
  year_of_completion VARCHAR(10) NULL,
  entry_order TINYINT NOT NULL DEFAULT 1, -- 1, 2, 3, 4, or 5
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_education (staff_id, entry_order)
);

-- =====================================================
-- 6. Work Experience Table (5 entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_work_experience (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  organization VARCHAR(255) NOT NULL,
  designation VARCHAR(255) NOT NULL,
  from_date DATE NULL,
  to_date DATE NULL,
  reason_for_leaving TEXT NULL,
  entry_order TINYINT NOT NULL DEFAULT 1, -- 1, 2, 3, 4, or 5
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_experience (staff_id, entry_order)
);

-- =====================================================
-- 7. References Table (2 entries)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_references (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(255) NULL,
  company VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  entry_order TINYINT NOT NULL DEFAULT 1, -- 1 or 2
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_staff_reference (staff_id, entry_order)
);

-- =====================================================
-- Indexes for better query performance
-- =====================================================

CREATE INDEX idx_staff_manager ON staff(manager_id);
CREATE INDEX idx_staff_beneficiaries ON staff_beneficiaries(staff_id);
CREATE INDEX idx_staff_emergency_contacts ON staff_emergency_contacts(staff_id);
CREATE INDEX idx_staff_family ON staff_family(staff_id);
CREATE INDEX idx_staff_education ON staff_education(staff_id);
CREATE INDEX idx_staff_work_experience ON staff_work_experience(staff_id);
CREATE INDEX idx_staff_references ON staff_references(staff_id);

-- =====================================================
-- Sample Queries
-- =====================================================

-- Get staff with all related data
/*
SELECT 
  s.*,
  m.name as manager_name,
  JSON_EXTRACT(s.benefits, '$') as benefits,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id,
    'name', name,
    'relationship', relationship,
    'contact', contact,
    'entry_order', entry_order
  )) FROM staff_beneficiaries WHERE staff_id = s.id) as beneficiaries,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id,
    'name', name,
    'relationship', relationship,
    'contact', contact,
    'entry_order', entry_order
  )) FROM staff_emergency_contacts WHERE staff_id = s.id) as emergency_contacts,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id,
    'name', name,
    'relationship', relationship,
    'contact', contact,
    'entry_order', entry_order
  )) FROM staff_family WHERE staff_id = s.id) as family,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id,
    'institution', institution,
    'qualification', qualification,
    'year_of_completion', year_of_completion,
    'entry_order', entry_order
  )) FROM staff_education WHERE staff_id = s.id ORDER BY entry_order) as education,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id,
    'organization', organization,
    'designation', designation,
    'from_date', from_date,
    'to_date', to_date,
    'reason_for_leaving', reason_for_leaving,
    'entry_order', entry_order
  )) FROM staff_work_experience WHERE staff_id = s.id ORDER BY entry_order) as work_experience,
  (SELECT JSON_ARRAYAGG(JSON_OBJECT(
    'id', id,
    'name', name,
    'position', position,
    'company', company,
    'phone', phone,
    'email', email,
    'entry_order', entry_order
  )) FROM staff_references WHERE staff_id = s.id) as references
FROM staff s
LEFT JOIN staff m ON s.manager_id = m.id
WHERE s.id = ?;
*/

