const connection = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupMyAssetsTable() {
  try {
    console.log('Setting up my_assets table...\n');
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database', 'my_assets_schema.sql');
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
    
    console.log('\n✅ my_assets table setup completed successfully!');
    
    // Verify the table was created
    const [columns] = await connection.query('DESCRIBE my_assets');
    console.log('\nTable structure:');
    console.log('================');
    console.log('Field\t\tType\t\tNull\tKey\tDefault\tExtra');
    console.log('-----\t\t----\t\t----\t---\t-------\t-----');
    
    columns.forEach(column => {
      console.log(`${column.Field}\t\t${column.Type}\t\t${column.Null}\t${column.Key}\t${column.Default || 'NULL'}\t${column.Extra || ''}`);
    });
    
    // Show sample data
    const [assets] = await connection.query(`
      SELECT ma.*, s.company_name as supplier_name 
      FROM my_assets ma 
      LEFT JOIN suppliers s ON ma.supplier_id = s.id 
      LIMIT 5
    `);
    
    console.log('\nSample data:');
    console.log('============');
    assets.forEach(asset => {
      console.log(`- ${asset.asset_code}: ${asset.asset_name} (${asset.asset_type}) - ${asset.supplier_name} - KES ${asset.price}`);
    });
    
  } catch (error) {
    console.error('❌ Error setting up my_assets table:', error);
  } finally {
    process.exit(0);
  }
}

setupMyAssetsTable(); 