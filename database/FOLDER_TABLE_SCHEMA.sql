-- ============================================
-- Document Folders Table Schema
-- ============================================

-- 1. CREATE document_folders TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  parent_folder_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE CASCADE,
  INDEX idx_parent_folder (parent_folder_id)
);

-- Table Structure:
-- +------------------+--------------+------+-----+-------------------+-------------------+
-- | Field            | Type         | Null | Key | Default           | Extra             |
-- +------------------+--------------+------+-----+-------------------+-------------------+
-- | id               | INT          | NO   | PRI | NULL              | auto_increment    |
-- | name             | VARCHAR(255) | NO   |     | NULL              |                   |
-- | parent_folder_id | INT          | YES  | MUL | NULL              |                   |
-- | created_at       | TIMESTAMP    | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
-- | updated_at       | TIMESTAMP    | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
-- +------------------+--------------+------+-----+-------------------+-------------------+
--
-- Indexes:
-- - PRIMARY KEY (id)
-- - INDEX idx_parent_folder (parent_folder_id)
-- - FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE CASCADE

-- ============================================
-- 2. MODIFY documents TABLE
-- ============================================

-- Add parent_folder_id column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS parent_folder_id INT NULL;

-- Add foreign key constraint
ALTER TABLE documents 
ADD CONSTRAINT fk_document_folder 
FOREIGN KEY (parent_folder_id) 
REFERENCES document_folders(id) 
ON DELETE SET NULL;

-- Add index for better query performance
ALTER TABLE documents 
ADD INDEX IF NOT EXISTS idx_parent_folder (parent_folder_id);

-- Updated documents table structure (after migration):
-- +------------------+--------------+------+-----+-------------------+-------------------+
-- | Field            | Type         | Null | Key | Default           | Extra             |
-- +------------------+--------------+------+-----+-------------------+-------------------+
-- | id               | INT          | NO   | PRI | NULL              | auto_increment    |
-- | title            | VARCHAR(255) | NO   |     | NULL              |                   |
-- | category         | VARCHAR(100) | NO   |     | NULL              |                   |
-- | file_url         | VARCHAR(255) | NO   |     | NULL              |                   |
-- | description      | TEXT         | YES  |     | NULL              |                   |
-- | uploaded_at      | TIMESTAMP    | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED |
-- | start_date       | DATE         | YES  |     | NULL              |                   |
-- | end_date         | DATE         | YES  |     | NULL              |                   |
-- | parent_folder_id | INT          | YES  | MUL | NULL              |                   |  <-- NEW
-- +------------------+--------------+------+-----+-------------------+-------------------+
--
-- New Indexes:
-- - INDEX idx_parent_folder (parent_folder_id)
-- - FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE SET NULL

-- ============================================
-- RELATIONSHIPS
-- ============================================

-- document_folders (self-referencing)
--   id (PK)
--   parent_folder_id (FK -> document_folders.id)
--     └── Allows nested folder structure
--     └── NULL = root folder
--     └── CASCADE DELETE = deleting folder deletes all subfolders

-- documents
--   id (PK)
--   parent_folder_id (FK -> document_folders.id)
--     └── Links document to its containing folder
--     └── NULL = document at root level
--     └── SET NULL = deleting folder moves documents to root (doesn't delete them)

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Get all root folders (folders with no parent)
-- SELECT * FROM document_folders WHERE parent_folder_id IS NULL;

-- Get all folders inside a specific folder
-- SELECT * FROM document_folders WHERE parent_folder_id = 1;

-- Get all documents in root level
-- SELECT * FROM documents WHERE parent_folder_id IS NULL;

-- Get all documents in a specific folder
-- SELECT * FROM documents WHERE parent_folder_id = 1;

-- Get folder with its path (requires recursive query or application logic)
-- SELECT f1.id, f1.name, f2.id as parent_id, f2.name as parent_name
-- FROM document_folders f1
-- LEFT JOIN document_folders f2 ON f1.parent_folder_id = f2.id
-- WHERE f1.id = 1;

