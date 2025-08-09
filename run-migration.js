const db = require('./database/db');

async function runMigration() {
  try {
    console.log('Starting migration: add tax columns to purchase_order_items and invoice_number to purchase_orders...');
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

    // Add invoice_number to purchase_orders if missing
    const [poColumns] = await db.query('DESCRIBE purchase_orders');
    const hasInvoiceNumber = poColumns.some(c => c.Field === 'invoice_number');
    if (!hasInvoiceNumber) {
      await db.query('ALTER TABLE purchase_orders ADD COLUMN invoice_number VARCHAR(50) NULL AFTER po_number');
      console.log('✓ Added purchase_orders.invoice_number');
    } else {
      console.log('purchase_orders.invoice_number already exists');
    }

    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 