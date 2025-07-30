-- Fix foreign key constraint in faulty_products_reports table
-- Change reported_by and assigned_to to reference staff table instead of users table

-- First, drop the existing foreign key constraints
ALTER TABLE faulty_products_reports 
DROP FOREIGN KEY faulty_products_reports_ibfk_2;

ALTER TABLE faulty_products_reports 
DROP FOREIGN KEY faulty_products_reports_ibfk_3;

-- Add new foreign key constraints that reference staff table
ALTER TABLE faulty_products_reports 
ADD CONSTRAINT fk_faulty_products_reports_reported_by 
FOREIGN KEY (reported_by) REFERENCES staff(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE faulty_products_reports 
ADD CONSTRAINT fk_faulty_products_reports_assigned_to 
FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Show the updated table structure
DESCRIBE faulty_products_reports; 