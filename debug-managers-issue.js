const db = require('./database/db');

async function debugManagersIssue() {
  try {
    console.log('Debugging managers issue...');
    
    // Check if managers table exists
    try {
      const [tables] = await db.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'managers'
      `);
      console.log('Managers table exists:', tables.length > 0);
    } catch (err) {
      console.log('Error checking managers table:', err.message);
    }
    
    // Try to query managers table directly
    try {
      const [managers] = await db.query('SELECT * FROM managers LIMIT 5');
      console.log(`Managers table has ${managers.length} records`);
      if (managers.length > 0) {
        console.log('Sample manager:', managers[0]);
      }
    } catch (err) {
      console.log('Error querying managers table:', err.message);
    }
    
    // Check if SalesRep table exists
    try {
      const [salesReps] = await db.query('SELECT * FROM SalesRep LIMIT 5');
      console.log(`SalesRep table has ${salesReps.length} records`);
    } catch (err) {
      console.log('Error querying SalesRep table:', err.message);
    }
    
    // Check if targets tables exist
    try {
      const [distTargets] = await db.query('SELECT * FROM distributors_targets LIMIT 5');
      console.log(`Distributors targets table has ${distTargets.length} records`);
    } catch (err) {
      console.log('Error querying distributors_targets table:', err.message);
    }
    
  } catch (error) {
    console.error('Error debugging managers issue:', error);
  } finally {
    process.exit(0);
  }
}

debugManagersIssue(); 