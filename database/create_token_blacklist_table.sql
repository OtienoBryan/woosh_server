-- Token Blacklist Table
-- Stores invalidated JWT tokens to prevent reuse after logout
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_id INT,
  expires_at TIMESTAMP NOT NULL,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_id (user_id)
);

-- Cleanup procedure: Remove expired tokens periodically
-- This can be called via a scheduled job or manually
-- DELETE FROM token_blacklist WHERE expires_at < NOW();
