-- Create ClientAssignment table for assigning sales reps to clients/outlets
CREATE TABLE IF NOT EXISTS ClientAssignment (
  id INT(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  outletId INT(11) NOT NULL,
  salesRepId INT(11) NOT NULL,
  assignedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  status VARCHAR(191) NOT NULL DEFAULT 'active',
  FOREIGN KEY (outletId) REFERENCES Clients(id) ON DELETE CASCADE,
  FOREIGN KEY (salesRepId) REFERENCES SalesRep(id) ON DELETE CASCADE,
  INDEX idx_outlet_id (outletId),
  INDEX idx_sales_rep_id (salesRepId),
  INDEX idx_status (status),
  INDEX idx_assigned_at (assignedAt)
);
