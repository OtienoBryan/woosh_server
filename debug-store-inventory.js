const connection = require('./database/db');

async function debugStoreInventory() {
  try {
    console.log('🔍 Debugging store inventory...\n');
    
    // Check if store_inventory table exists
    console.log('1. Checking if store_inventory table exists...');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'store_inventory'
    `);
    
    if (tables.length === 0) {
      console.log('❌ store_inventory table does not exist!');
      return;
    }
    console.log('✅ store_inventory table exists\n');
    
    // Show table structure
    console.log('2. Store inventory table structure:');
    const [columns] = await connection.query('DESCRIBE store_inventory');
    console.table(columns);
    console.log();
    
    // Check total records
    console.log('3. Total records in store_inventory:');
    const [countResult] = await connection.query('SELECT COUNT(*) as total FROM store_inventory');
    console.log(`Total records: ${countResult[0].total}\n`);
    
    // Show sample data
    console.log('4. Sample data from store_inventory:');
    const [sampleData] = await connection.query(`
      SELECT si.*, p.product_name, p.product_code, s.store_name
      FROM store_inventory si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN stores s ON si.store_id = s.id
      LIMIT 10
    `);
    console.table(sampleData);
    console.log();
    
    // Check stores
    console.log('5. Available stores:');
    const [stores] = await connection.query('SELECT id, store_name, store_code FROM stores');
    console.table(stores);
    console.log();
    
    // Check products
    console.log('6. Available products (first 10):');
    const [products] = await connection.query(`
      SELECT id, product_name, product_code, is_active 
      FROM products 
      LIMIT 10
    `);
    console.table(products);
    console.log();
    
    // Test specific store inventory
    if (stores.length > 0) {
      const testStoreId = stores[0].id;
      console.log(`7. Inventory for store ID ${testStoreId} (${stores[0].store_name}):`);
      const [storeInventory] = await connection.query(`
        SELECT si.*, p.product_name, p.product_code, p.is_active
        FROM store_inventory si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.store_id = ?
      `, [testStoreId]);
      console.table(storeInventory);
    }
    
  } catch (error) {
    console.error('❌ Error debugging store inventory:', error);
  } finally {
    await connection.end();
  }
}

debugStoreInventory(); 