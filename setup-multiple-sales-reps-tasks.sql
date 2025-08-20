-- Migration to support multiple sales rep assignments for tasks
-- This will create a new table to store multiple sales rep assignments per task

-- Create a new table for task assignments
CREATE TABLE IF NOT EXISTS task_sales_rep_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  sales_rep_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES hr_calendar_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_rep_id) REFERENCES staff(id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_sales_rep (task_id, sales_rep_id)
);

-- Add index for better performance
CREATE INDEX idx_task_sales_rep_assignments_task_id ON task_sales_rep_assignments(task_id);
CREATE INDEX idx_task_sales_rep_assignments_sales_rep_id ON task_sales_rep_assignments(sales_rep_id);

-- Optional: Keep the existing assigned_to field for backward compatibility
-- but we can deprecate it later
