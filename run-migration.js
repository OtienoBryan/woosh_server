const db = require('./database/db');

async function runMigration() {
  try {
    console.log('Starting migration: add tax columns to purchase_order_items...');
    // Check columns
    const [columns] = await db.query('DESCRIBE purchase_order_items');
    const hasTaxAmount = columns.some(c => c.Field === 'tax_amount');
    const hasTaxType = columns.some(c => c.Field === 'tax_type');

    if (!hasTaxAmount) {
      await db.query('ALTER TABLE purchase_order_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0');
      console.log('✓ Added tax_amount');
    } else {
      console.log('tax_amount already exists');
    }

    if (!hasTaxType) {
      await db.query("ALTER TABLE purchase_order_items ADD COLUMN tax_type VARCHAR(20) NULL");
      console.log('✓ Added tax_type');
    } else {
      console.log('tax_type already exists');
    }

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 