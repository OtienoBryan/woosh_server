-- Add folder support to documents system
-- This migration adds the ability to create nested folders and organize documents within folders

-- Create document_folders table
CREATE TABLE IF NOT EXISTS document_folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  parent_folder_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE CASCADE,
  INDEX idx_parent_folder (parent_folder_id)
);

-- Add parent_folder_id to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_folder_id INT NULL;
ALTER TABLE documents ADD CONSTRAINT fk_document_folder FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;

-- Add index for better query performance
ALTER TABLE documents ADD INDEX IF NOT EXISTS idx_parent_folder (parent_folder_id);

