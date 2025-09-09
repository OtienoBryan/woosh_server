-- Add start_date and end_date columns to documents table
-- These columns store only dates (no time component)
ALTER TABLE documents 
ADD COLUMN start_date DATE NULL,
ADD COLUMN end_date DATE NULL;
