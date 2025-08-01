const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function migrateMyStatusToOrders() {
  try {
    console.log('Starting migration: Adding my_status to sales_orders table...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'add-my-status-to-orders.sql'), 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
        await db.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    console.log('The my_status column has been added to the sales_orders table.');
    console.log('Existing confirmed orders have been set to my_status = 1.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateMyStatusToOrders(); 