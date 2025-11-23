-- Create public holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  country VARCHAR(100) DEFAULT 'Kenya',
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Kenya Public Holidays for 2024
INSERT INTO public_holidays (name, date, country, is_recurring) VALUES
-- 2024 Holidays
('New Year''s Day', '2024-01-01', 'Kenya', TRUE),
('Good Friday', '2024-03-29', 'Kenya', FALSE),
('Easter Monday', '2024-04-01', 'Kenya', FALSE),
('Labour Day', '2024-05-01', 'Kenya', TRUE),
('Madaraka Day', '2024-06-01', 'Kenya', TRUE),
('Eid ul-Adha', '2024-06-16', 'Kenya', FALSE),
('Mashujaa Day', '2024-10-20', 'Kenya', TRUE),
('Jamhuri Day', '2024-12-12', 'Kenya', TRUE),
('Christmas Day', '2024-12-25', 'Kenya', TRUE),
('Boxing Day', '2024-12-26', 'Kenya', TRUE),

-- 2025 Holidays
('New Year''s Day', '2025-01-01', 'Kenya', TRUE),
('Good Friday', '2025-04-18', 'Kenya', FALSE),
('Easter Monday', '2025-04-21', 'Kenya', FALSE),
('Labour Day', '2025-05-01', 'Kenya', TRUE),
('Eid ul-Fitr', '2025-03-31', 'Kenya', FALSE),
('Madaraka Day', '2025-06-01', 'Kenya', TRUE),
('Eid ul-Adha', '2025-06-06', 'Kenya', FALSE),
('Mashujaa Day', '2025-10-20', 'Kenya', TRUE),
('Jamhuri Day', '2025-12-12', 'Kenya', TRUE),
('Christmas Day', '2025-12-25', 'Kenya', TRUE),
('Boxing Day', '2025-12-26', 'Kenya', TRUE),

-- 2026 Holidays (projected)
('New Year''s Day', '2026-01-01', 'Kenya', TRUE),
('Good Friday', '2026-04-03', 'Kenya', FALSE),
('Easter Monday', '2026-04-06', 'Kenya', FALSE),
('Labour Day', '2026-05-01', 'Kenya', TRUE),
('Eid ul-Fitr', '2026-03-20', 'Kenya', FALSE),
('Madaraka Day', '2026-06-01', 'Kenya', TRUE),
('Eid ul-Adha', '2026-05-27', 'Kenya', FALSE),
('Mashujaa Day', '2026-10-20', 'Kenya', TRUE),
('Jamhuri Day', '2026-12-12', 'Kenya', TRUE),
('Christmas Day', '2026-12-25', 'Kenya', TRUE),
('Boxing Day', '2026-12-26', 'Kenya', TRUE)

ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  country = VALUES(country),
  is_recurring = VALUES(is_recurring);

