const connection = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupAssetPurchaseOrdersTables() {
  try {
    console.log('Setting up asset purchase orders tables...\n');
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database', 'asset_purchase_orders_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await connection.query(statement);
      }
    }
    
    console.log('\n✅ Asset purchase orders tables setup completed successfully!');
    
    // Verify the tables were created
    console.log('\nTable structures:');
    const [assetPOColumns] = await connection.query('DESCRIBE asset_purchase_orders');
    const [assetPOIColumns] = await connection.query('DESCRIBE asset_purchase_order_items');
    
    console.log('\nasset_purchase_orders:');
    console.table(assetPOColumns);
    
    console.log('\nasset_purchase_order_items:');
    console.table(assetPOIColumns);
    
  } catch (error) {
    console.error('❌ Error setting up asset purchase orders tables:', error);
  } finally {
    process.exit(0);
  }
}

setupAssetPurchaseOrdersTables();

