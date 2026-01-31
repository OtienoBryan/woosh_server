-- Audit Trail Table
-- Records all user activities in the system

CREATE TABLE IF NOT EXISTS audit_trail (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(100),
  action VARCHAR(100) NOT NULL, -- e.g., 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'
  entity_type VARCHAR(100), -- e.g., 'staff', 'client', 'invoice', 'order'
  entity_id INT, -- ID of the affected entity
  description TEXT, -- Detailed description of the action
  ip_address VARCHAR(45), -- IPv4 or IPv6 address
  user_agent TEXT, -- Browser/client information
  request_method VARCHAR(10), -- GET, POST, PUT, DELETE, PATCH
  request_url VARCHAR(500), -- API endpoint or URL
  request_body JSON, -- Request payload (for POST/PUT/PATCH)
  response_status INT, -- HTTP response status code
  success BOOLEAN DEFAULT TRUE, -- Whether the action was successful
  error_message TEXT, -- Error message if action failed
  session_id VARCHAR(255), -- Session identifier
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_user_name (user_name),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_action (user_id, action),
  INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
