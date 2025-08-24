-- Migration: Create JourneyPlan table
-- Date: 2024-12-19
-- Description: Create table for managing sales representative journey plans

CREATE TABLE IF NOT EXISTS JourneyPlan (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  date datetime(3) NOT NULL,
  time varchar(191) NOT NULL,
  userId int(11) DEFAULT NULL,
  clientId int(11) NOT NULL,
  status int(11) NOT NULL DEFAULT 0,
  checkInTime datetime(3) DEFAULT NULL,
  latitude double DEFAULT NULL,
  longitude double DEFAULT NULL,
  imageUrl varchar(191) DEFAULT NULL,
  notes varchar(191) DEFAULT NULL,
  checkoutLatitude double DEFAULT NULL,
  checkoutLongitude double DEFAULT NULL,
  checkoutTime datetime(3) DEFAULT NULL,
  showUpdateLocation tinyint(1) NOT NULL DEFAULT 1,
  routeId int(11) DEFAULT NULL,
  createdAt datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  -- Indexes for better performance
  INDEX idx_userId (userId),
  INDEX idx_clientId (clientId),
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_routeId (routeId),
  
  -- Foreign key constraints
  CONSTRAINT fk_journey_plan_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_journey_plan_client FOREIGN KEY (clientId) REFERENCES Clients(id) ON DELETE CASCADE,
  CONSTRAINT fk_journey_plan_route FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for testing (optional)
-- INSERT INTO JourneyPlan (date, time, userId, clientId, status, notes, showUpdateLocation) VALUES
-- ('2024-12-20 09:00:00', '09:00', 1, 1, 0, 'Initial client visit', 1),
-- ('2024-12-20 14:00:00', '14:00', 1, 2, 0, 'Follow-up meeting', 1);
