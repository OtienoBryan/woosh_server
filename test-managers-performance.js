const db = require('./database/db');

async function testManagersPerformance() {
  try {
    console.log('Testing managers performance setup...');
    
    // Check if required tables exist
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('managers', 'SalesRep', 'distributors_targets', 'key_account_targets', 'retail_targets', 'Clients', 'sales_orders', 'sales_order_items', 'products')
    `);
    
    console.log('Existing tables:', tables.map(t => t.TABLE_NAME));
    
    // Check managers table
    try {
      const [managers] = await db.query('SELECT * FROM managers LIMIT 5');
      console.log(`Managers table has ${managers.length} records`);
      if (managers.length > 0) {
        console.log('Sample manager:', managers[0]);
      }
    } catch (err) {
      console.log('Managers table error:', err.message);
    }
    
    // Check SalesRep table
    try {
      const [salesReps] = await db.query('SELECT * FROM SalesRep LIMIT 5');
      console.log(`SalesRep table has ${salesReps.length} records`);
      if (salesReps.length > 0) {
        console.log('Sample sales rep:', salesReps[0]);
      }
    } catch (err) {
      console.log('SalesRep table error:', err.message);
    }
    
    // Check targets tables
    try {
      const [distTargets] = await db.query('SELECT * FROM distributors_targets LIMIT 5');
      console.log(`Distributors targets table has ${distTargets.length} records`);
    } catch (err) {
      console.log('Distributors targets table error:', err.message);
    }
    
    try {
      const [keyTargets] = await db.query('SELECT * FROM key_account_targets LIMIT 5');
      console.log(`Key account targets table has ${keyTargets.length} records`);
    } catch (err) {
      console.log('Key account targets table error:', err.message);
    }
    
    try {
      const [retailTargets] = await db.query('SELECT * FROM retail_targets LIMIT 5');
      console.log(`Retail targets table has ${retailTargets.length} records`);
    } catch (err) {
      console.log('Retail targets table error:', err.message);
    }
    
  } catch (error) {
    console.error('Error testing managers performance:', error);
  } finally {
    process.exit(0);
  }
}

testManagersPerformance(); 