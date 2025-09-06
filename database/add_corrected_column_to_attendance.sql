-- Add corrected column to attendance table
-- This column tracks whether a record has been manually corrected
-- 0 = original record, 1 = corrected record

-- Add the corrected column
ALTER TABLE attendance ADD COLUMN corrected TINYINT(1) DEFAULT 0;

-- Add created_at and updated_at columns if they don't exist
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Update existing records to have corrected = 0 (original records)
UPDATE attendance SET corrected = 0 WHERE corrected IS NULL;

-- Add index for better performance on corrected column
CREATE INDEX idx_attendance_corrected ON attendance(corrected);

-- Show the updated table structure
DESCRIBE attendance;
