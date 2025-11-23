-- Simple migration script for approval status columns
-- Run this in your MySQL database

ALTER TABLE department_expenses 
ADD COLUMN hr_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN hr_approved_by INT NULL,
ADD COLUMN hr_approved_at TIMESTAMP NULL,
ADD COLUMN finance_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN finance_approved_by INT NULL,
ADD COLUMN finance_approved_at TIMESTAMP NULL,
ADD COLUMN hr_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN finance_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN rejection_reason TEXT NULL;

-- Add foreign keys for approvers
ALTER TABLE department_expenses 
ADD CONSTRAINT fk_hr_approved_by FOREIGN KEY (hr_approved_by) REFERENCES staff(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_finance_approved_by FOREIGN KEY (finance_approved_by) REFERENCES staff(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX idx_dept_exp_hr_approved ON department_expenses(hr_approved);
CREATE INDEX idx_dept_exp_finance_approved ON department_expenses(finance_approved);

