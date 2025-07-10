const mysql = require('mysql2/promise');

async function fixInventoryReceipts() {
  let connection;

  try {
    console.log('Connecting to database...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'retail_finance'
    });

    console.log('✅ Connected to database');

    // Check current table structure
    const [columns] = await connection.query('DESCRIBE inventory_receipts');
    console.log('Current inventory_receipts columns:', columns.map(col => col.Field));

    // Check if unit_cost column exists
    const hasUnitCost = columns.some(col => col.Field === 'unit_cost');
    const hasTotalCost = columns.some(col => col.Field === 'total_cost');

    if (!hasUnitCost) {
      console.log('Adding unit_cost column...');
      await connection.query(`
        ALTER TABLE inventory_receipts 
        ADD COLUMN unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00
      `);
      console.log('✅ unit_cost column added');
    }

    if (!hasTotalCost) {
      console.log('Adding total_cost column...');
      await connection.query(`
        ALTER TABLE inventory_receipts 
        ADD COLUMN total_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00
      `);
      console.log('✅ total_cost column added');
    }

    // Check if store_inventory table exists
    const [inventoryTables] = await connection.query('SHOW TABLES LIKE "store_inventory"');
    if (inventoryTables.length === 0) {
      console.log('Creating store_inventory table...');
      await connection.query(`
        CREATE TABLE store_inventory (
          id INT PRIMARY KEY AUTO_INCREMENT,
          store_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_store_product (store_id, product_id),
          FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ store_inventory table created');
    }

    // Check final table structure
    const [finalColumns] = await connection.query('DESCRIBE inventory_receipts');
    console.log('Final inventory_receipts columns:', finalColumns.map(col => col.Field));

    console.log('✅ Inventory receipts table fixed successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
}

fixInventoryReceipts(); 