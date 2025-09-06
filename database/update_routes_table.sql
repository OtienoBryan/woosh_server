-- Update routes table to include all required fields
-- This migration adds the missing columns to the existing routes table

-- First, check if the table exists and add missing columns
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS region INT(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS region_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS country_id INT(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS country_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS leader_id INT(11) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS leader_name VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS status INT(11) NOT NULL DEFAULT 1;

-- Add foreign key constraints if they don't exist
-- Note: These might fail if the referenced tables don't exist or have different structures
-- ALTER TABLE routes ADD CONSTRAINT fk_routes_country FOREIGN KEY (country_id) REFERENCES countries(id);
-- ALTER TABLE routes ADD CONSTRAINT fk_routes_region FOREIGN KEY (region) REFERENCES regions(id);
-- ALTER TABLE routes ADD CONSTRAINT fk_routes_leader FOREIGN KEY (leader_id) REFERENCES SalesRep(id);
