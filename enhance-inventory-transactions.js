const mysql = require('mysql2/promise');
require('dotenv').config();

async function enhanceInventoryTransactions() {
  let connection;

  try {
    // Create connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_finance'
    });

    console.log('Connected to database');

    // Check current table structure
    console.log('📊 Checking current inventory_transactions table structure...');
    
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory_transactions' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Add store_id column if it doesn't exist
    const storeIdExists = columns.some(col => col.COLUMN_NAME === 'store_id');
    if (!storeIdExists) {
      console.log('➕ Adding store_id column...');
      await connection.query('ALTER TABLE inventory_transactions ADD COLUMN store_id INT AFTER product_id');
      console.log('✅ store_id column added');
    } else {
      console.log('✅ store_id column already exists');
    }

    // Add staff_id column if it doesn't exist  
    const staffIdExists = columns.some(col => col.COLUMN_NAME === 'staff_id');
    if (!staffIdExists) {
      console.log('➕ Adding staff_id column...');
      await connection.query('ALTER TABLE inventory_transactions ADD COLUMN staff_id INT AFTER created_by');
      console.log('✅ staff_id column added');
    } else {
      console.log('✅ staff_id column already exists');
    }

    // Add date_received column if it doesn't exist
    const dateReceivedExists = columns.some(col => col.COLUMN_NAME === 'date_received');
    if (!dateReceivedExists) {
      console.log('➕ Adding date_received column...');
      await connection.query('ALTER TABLE inventory_transactions ADD COLUMN date_received TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER transaction_date');
      console.log('✅ date_received column added');
    } else {
      console.log('✅ date_received column already exists');
    }

    // Update transaction_type enum
    console.log('🔄 Updating transaction_type enum...');
    try {
      await connection.query(`
        ALTER TABLE inventory_transactions 
        MODIFY COLUMN transaction_type 
        ENUM('purchase', 'sale', 'adjustment', 'transfer', 'credit_note_return', 'in', 'out') NOT NULL
      `);
      console.log('✅ transaction_type enum updated');
    } catch (enumError) {
      console.log('⚠️ transaction_type enum update skipped:', enumError.message);
    }

    // Add foreign key for store_id if stores table exists
    const [storesTable] = await connection.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'stores' AND TABLE_SCHEMA = DATABASE()
    `);

    if (storesTable[0].count > 0) {
      try {
        await connection.query(`
          ALTER TABLE inventory_transactions 
          ADD CONSTRAINT fk_inventory_transactions_store_id 
          FOREIGN KEY (store_id) REFERENCES stores(id)
        `);
        console.log('✅ Foreign key constraint added for store_id');
      } catch (fkError) {
        console.log('⚠️ Foreign key constraint skipped (may already exist):', fkError.message);
      }
    }

    // Add performance index
    try {
      await connection.query(`
        ALTER TABLE inventory_transactions 
        ADD INDEX idx_store_product_date (store_id, product_id, transaction_date)
      `);
      console.log('✅ Performance index added');
    } catch (indexError) {
      console.log('⚠️ Index creation skipped (may already exist):', indexError.message);
    }

    // Show final structure
    console.log('\n📊 Final inventory_transactions table structure:');
    const [finalColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'inventory_transactions' 
      AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    
    finalColumns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n✅ Inventory transactions table enhancement completed successfully');

  } catch (error) {
    console.error('❌ Error during enhancement:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the enhancement
enhanceInventoryTransactions()
  .then(() => {
    console.log('Enhancement script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Enhancement failed:', error);
    process.exit(1);
  });
