const mysql = require('mysql2/promise');
require('dotenv').config();

async function migratePurchaseOrderItemsTax() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'citlogis_finance',
      multipleStatements: true,
    });

    // Describe columns
    const [columns] = await connection.query('DESCRIBE purchase_order_items');
    const hasTaxAmount = columns.some(c => c.Field === 'tax_amount');
    const hasTaxType = columns.some(c => c.Field === 'tax_type');

    if (!hasTaxAmount) {
      console.log('Adding tax_amount column to purchase_order_items...');
      await connection.query('ALTER TABLE purchase_order_items ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT 0');
      console.log('✓ tax_amount added');
    } else {
      console.log('tax_amount already exists');
    }

    if (!hasTaxType) {
      console.log('Adding tax_type column to purchase_order_items...');
      await connection.query("ALTER TABLE purchase_order_items ADD COLUMN tax_type VARCHAR(20) NULL");
      console.log('✓ tax_type added');
    } else {
      console.log('tax_type already exists');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  migratePurchaseOrderItemsTax();
}

module.exports = migratePurchaseOrderItemsTax;

