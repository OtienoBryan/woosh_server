const db = require('./database/db');

async function testRoutes() {
  try {
    console.log('Testing routes functionality...\n');
    
    // 1. Check if routes table exists and its structure
    console.log('1. Checking routes table structure:');
    try {
      const [columns] = await db.query('DESCRIBE routes');
      console.log('Routes table exists with columns:');
      console.table(columns);
    } catch (err) {
      console.error('Routes table does not exist or error:', err.message);
      return;
    }
    
    // 2. Check if there are any routes in the table
    console.log('\n2. Checking existing routes:');
    try {
      const [routes] = await db.query('SELECT * FROM routes LIMIT 5');
      console.log(`Found ${routes.length} routes:`);
      console.table(routes);
    } catch (err) {
      console.error('Error fetching routes:', err.message);
    }
    
    // 3. Test the migration by adding a sample route
    console.log('\n3. Testing route creation:');
    try {
      const [result] = await db.query(`
        INSERT INTO routes (name, region, region_name, country_id, country_name, sales_rep_id, sales_rep_name, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['Test Route', 1, 'Test Region', 1, 'Test Country', 1, 'Test Sales Rep', 1]);
      
      console.log('Successfully created test route with ID:', result.insertId);
      
      // Clean up - delete the test route
      await db.query('DELETE FROM routes WHERE id = ?', [result.insertId]);
      console.log('Test route cleaned up');
    } catch (err) {
      console.error('Error creating test route:', err.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the database connection
    if (db.end) {
      db.end();
    }
  }
}

testRoutes();
