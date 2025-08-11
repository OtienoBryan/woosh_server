-- Add received_by and received_at columns to credit_notes table
-- This tracks who received the items back and when

ALTER TABLE credit_notes 
ADD COLUMN received_by INT NULL AFTER my_status,
ADD COLUMN received_at DATETIME NULL AFTER received_by;

-- Add foreign key constraint to link received_by to users table
-- Note: This assumes you have a users table. Adjust the table name if different.
ALTER TABLE credit_notes
ADD CONSTRAINT fk_credit_notes_received_by 
FOREIGN KEY (received_by) REFERENCES users(id);

-- Add index for better query performance
CREATE INDEX idx_credit_notes_received_by ON credit_notes (received_by);
CREATE INDEX idx_credit_notes_received_at ON credit_notes (received_at);
