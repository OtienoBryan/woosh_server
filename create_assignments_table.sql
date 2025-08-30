-- Create merchandise_assignments table
CREATE TABLE IF NOT EXISTS merchandise_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  merchandise_id INT NOT NULL,
  staff_id INT NOT NULL,
  quantity_assigned INT NOT NULL,
  date_assigned DATE NOT NULL,
  comment TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (merchandise_id) REFERENCES merchandise(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  INDEX idx_merchandise_id (merchandise_id),
  INDEX idx_staff_id (staff_id),
  INDEX idx_date_assigned (date_assigned)
);
