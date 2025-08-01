const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function migrateSalesRepToOrders() {
  try {
    console.log('Starting migration: Adding sales_rep_id to sales_orders table...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'add-sales-rep-to-orders.sql'), 'utf8');
    
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
    console.log('The sales_rep_id column has been added to the sales_orders table.');
    console.log('Existing orders have been assigned to the first available sales rep.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateSalesRepToOrders(); 