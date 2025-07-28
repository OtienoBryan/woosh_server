ALTER TABLE hr_calendar_tasks
  ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER date,
  ADD COLUMN description TEXT AFTER title,
  ADD COLUMN status ENUM('Pending','In Progress','Completed') DEFAULT 'Pending' AFTER description,
  ADD COLUMN assigned_to VARCHAR(100) AFTER status; 