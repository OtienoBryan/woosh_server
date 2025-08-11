-- Migration script to enhance inventory_transactions table for store support
-- This script adds store_id and other fields needed for proper inventory tracking

-- Check if store_id column exists, if not add it
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'inventory_transactions' 
     AND COLUMN_NAME = 'store_id'
     AND TABLE_SCHEMA = DATABASE()) > 0,
    'SELECT "store_id column already exists"',
    'ALTER TABLE inventory_transactions ADD COLUMN store_id INT AFTER product_id'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if staff_id column exists, if not add it
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'inventory_transactions' 
     AND COLUMN_NAME = 'staff_id'
     AND TABLE_SCHEMA = DATABASE()) > 0,
    'SELECT "staff_id column already exists"',
    'ALTER TABLE inventory_transactions ADD COLUMN staff_id INT AFTER created_by'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if date_received column exists, if not add it
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'inventory_transactions' 
     AND COLUMN_NAME = 'date_received'
     AND TABLE_SCHEMA = DATABASE()) > 0,
    'SELECT "date_received column already exists"',
    'ALTER TABLE inventory_transactions ADD COLUMN date_received TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER transaction_date'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update transaction_type enum to include credit_note_return
ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type 
ENUM('purchase', 'sale', 'adjustment', 'transfer', 'credit_note_return', 'in', 'out') NOT NULL;

-- Add foreign key constraint for store_id if stores table exists
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_NAME = 'stores' 
     AND TABLE_SCHEMA = DATABASE()) > 0 
    AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
         WHERE TABLE_NAME = 'inventory_transactions' 
         AND COLUMN_NAME = 'store_id'
         AND CONSTRAINT_NAME LIKE 'fk_%'
         AND TABLE_SCHEMA = DATABASE()) = 0,
    'ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inventory_transactions_store_id FOREIGN KEY (store_id) REFERENCES stores(id)',
    'SELECT "Foreign key for store_id already exists or stores table not found"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for better performance
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_NAME = 'inventory_transactions' 
     AND INDEX_NAME = 'idx_store_product_date'
     AND TABLE_SCHEMA = DATABASE()) = 0,
    'ALTER TABLE inventory_transactions ADD INDEX idx_store_product_date (store_id, product_id, transaction_date)',
    'SELECT "Index idx_store_product_date already exists"'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
