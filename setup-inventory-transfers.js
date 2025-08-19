const connection = require('./database/db');

async function setupInventoryTransfers() {
  try {
    console.log('🔍 Checking existing tables...');
    
    // Check if inventory_transfers table already exists
    const [existingTables] = await connection.query('SHOW TABLES LIKE "inventory_transfers"');
    if (existingTables.length > 0) {
      console.log('✅ inventory_transfers table already exists!');
      return;
    }
    
    console.log('📋 Setting up inventory_transfers table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        from_store_id INT NOT NULL,
        to_store_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        staff_id INT NOT NULL,
        reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (to_store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES users(id)
      )
    `;
    
    console.log('🔨 Creating table with SQL:', createTableSQL);
    
    await connection.query(createTableSQL);
    console.log('✅ inventory_transfers table created successfully!');
    
    // Verify table was created
    const [tables] = await connection.query('SHOW TABLES LIKE "inventory_transfers"');
    if (tables.length > 0) {
      console.log('✅ inventory_transfers table exists and is ready for use');
      
      // Check table structure
      const [columns] = await connection.query('DESCRIBE inventory_transfers');
      console.log('📊 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } else {
      console.log('❌ inventory_transfers table was not created');
    }
    
  } catch (error) {
    console.error('❌ Error setting up inventory_transfers table:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
  } finally {
    try {
      await connection.end();
      console.log('🔌 Database connection closed');
    } catch (closeError) {
      console.error('Error closing connection:', closeError);
    }
    process.exit(0);
  }
}

setupInventoryTransfers();
