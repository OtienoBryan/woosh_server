-- Add designation column to staff table
-- This migration adds a designation column to store job titles/positions separately from roles

-- Add designation column to staff table
ALTER TABLE staff ADD COLUMN designation VARCHAR(255) AFTER role;

-- Update existing records to populate designation from role (optional)
-- This copies the current role value to designation for existing staff
UPDATE staff SET designation = role WHERE designation IS NULL OR designation = '';

-- Add index for better performance on designation queries
CREATE INDEX idx_staff_designation ON staff(designation);
