const db = require('./database/db');

async function runMigration() {
  try {
    console.log('Starting sales_orders status migration...');
    
    // First, create a temporary column with the new ENUM values
    await db.query(`
      ALTER TABLE sales_orders 
      ADD COLUMN status_new ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'in payment', 'paid') DEFAULT 'draft'
    `);
    console.log('✓ Added temporary status_new column');
    
    // Copy data from the old column to the new column
    await db.query('UPDATE sales_orders SET status_new = status');
    console.log('✓ Copied data to temporary column');
    
    // Drop the old column
    await db.query('ALTER TABLE sales_orders DROP COLUMN status');
    console.log('✓ Dropped old status column');
    
    // Rename the new column to status
    await db.query(`
      ALTER TABLE sales_orders 
      CHANGE status_new status ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'in payment', 'paid') DEFAULT 'draft'
    `);
    console.log('✓ Renamed status_new to status');
    
    // Verify the update
    const [result] = await db.query('SELECT DISTINCT status FROM sales_orders ORDER BY status');
    console.log('✓ Migration completed successfully!');
    console.log('Available statuses:', result.map(r => r.status));
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 