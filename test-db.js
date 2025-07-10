const db = require('./config/database');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection and tables...\n');
    
    // Test connection
    const [result] = await db.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check what tables exist
    const [tables] = await db.query('SHOW TABLES');
    console.log('\n📋 Existing tables:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    
    // Test a specific table
    try {
      const [salesOrders] = await db.query('SELECT COUNT(*) as count FROM sales_orders');
      console.log(`\n✅ sales_orders table exists with ${salesOrders[0].count} records`);
    } catch (error) {
      console.log(`\n❌ sales_orders table error: ${error.message}`);
    }
    
    try {
      const [suppliers] = await db.query('SELECT COUNT(*) as count FROM suppliers');
      console.log(`✅ suppliers table exists with ${suppliers[0].count} records`);
    } catch (error) {
      console.log(`❌ suppliers table error: ${error.message}`);
    }
    
    try {
      const [accounts] = await db.query('SELECT COUNT(*) as count FROM chart_of_accounts');
      console.log(`✅ chart_of_accounts table exists with ${accounts[0].count} records`);
    } catch (error) {
      console.log(`❌ chart_of_accounts table error: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testDatabase(); 