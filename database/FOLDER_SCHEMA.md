# Document Folders Database Schema

## Overview
This schema adds folder support to the documents system, allowing nested folders and organizing documents within folders.

## Tables

### 1. document_folders Table
Stores folder information with support for nested folder structures.

```sql
CREATE TABLE IF NOT EXISTS document_folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  parent_folder_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_folder_id) REFERENCES document_folders(id) ON DELETE CASCADE,
  INDEX idx_parent_folder (parent_folder_id)
);
```

**Columns:**
- `id` - Primary key, auto-increment
- `name` - Folder name (required, max 255 characters)
- `parent_folder_id` - Reference to parent folder (NULL for root folders)
- `created_at` - Timestamp when folder was created
- `updated_at` - Timestamp when folder was last updated

**Constraints:**
- Self-referencing foreign key: `parent_folder_id` references `document_folders(id)`
- Cascade delete: If a folder is deleted, all subfolders are also deleted
- Index on `parent_folder_id` for faster queries

### 2. documents Table (Modified)
The existing documents table is extended with a `parent_folder_id` column.

**Existing Structure:**
```sql
CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_date DATE NULL,
  end_date DATE NULL
);
```

**New Column Added:**
```sql
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS parent_folder_id INT NULL;

ALTER TABLE documents 
ADD CONSTRAINT fk_document_folder 
FOREIGN KEY (parent_folder_id) 
REFERENCES document_folders(id) 
ON DELETE SET NULL;

ALTER TABLE documents 
ADD INDEX IF NOT EXISTS idx_parent_folder (parent_folder_id);
```

**New Column:**
- `parent_folder_id` - Reference to the folder containing this document (NULL for root level documents)

**Constraints:**
- Foreign key to `document_folders(id)`
- On delete: If a folder is deleted, documents in that folder have `parent_folder_id` set to NULL (moved to root)

## Relationships

```
document_folders
├── id (PK)
└── parent_folder_id (FK -> document_folders.id)
    └── Supports nested folder structure

documents
├── id (PK)
└── parent_folder_id (FK -> document_folders.id)
    └── Links document to its containing folder
```

## Example Data Structure

### Root Level
```
document_folders (id=1, name="Projects", parent_folder_id=NULL)
document_folders (id=2, name="Personal", parent_folder_id=NULL)
documents (id=1, title="Readme.pdf", parent_folder_id=NULL)
```

### Nested Folders
```
document_folders (id=3, name="2024", parent_folder_id=1)  -- Inside "Projects"
document_folders (id=4, name="Q1", parent_folder_id=3)     -- Inside "2024"
documents (id=2, title="Report.pdf", parent_folder_id=4)   -- Inside "Q1"
```

## Migration SQL

The complete migration script is in: `server/database/add_folders_support.sql`

To run the migration:
1. Via API endpoint: `POST /api/document-folders/migrate` (requires authentication)
2. Via SQL directly: Execute the SQL statements in `add_folders_support.sql`
3. Via Node script: `node server/run-folder-migration.js` (requires database connection)

## Indexes

1. `idx_parent_folder` on `document_folders(parent_folder_id)` - For fast folder queries
2. `idx_parent_folder` on `documents(parent_folder_id)` - For fast document queries by folder

## Notes

- Folders can be nested to any depth
- Root folders have `parent_folder_id = NULL`
- Documents can exist at root level (`parent_folder_id = NULL`) or inside folders
- Deleting a folder cascades to delete all subfolders
- Deleting a folder sets documents' `parent_folder_id` to NULL (documents are not deleted)

