const connection = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupFaultyProductsTables() {
  try {
    console.log('🔧 Setting up faulty products tables...');

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database', 'faulty_products_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('📝 Executing:', statement.substring(0, 50) + '...');
        await connection.query(statement);
      }
    }

    console.log('✅ Faulty products tables created successfully!');

    // Show the table structures
    console.log('\n📋 Table structures:');
    
    console.log('\n🔍 faulty_products_reports:');
    const [reportsStructure] = await connection.query('DESCRIBE faulty_products_reports');
    console.table(reportsStructure);

    console.log('\n🔍 faulty_products_items:');
    const [itemsStructure] = await connection.query('DESCRIBE faulty_products_items');
    console.table(itemsStructure);

    console.log('\n✅ Setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up faulty products tables:', error);
  } finally {
    await connection.end();
  }
}

setupFaultyProductsTables(); 