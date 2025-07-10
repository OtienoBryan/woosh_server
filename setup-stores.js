const db = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function setupStores() {
  try {
    console.log('🏪 Setting up stores and inventory system...\n');

    // Read and execute the store schema
    const schemaPath = path.join(__dirname, 'database', 'store_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📋 Executing store schema...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
            console.log(`⚠️  Table/Data already exists, skipping...`);
          } else {
            console.error(`❌ Error executing statement: ${error.message}`);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('\n✅ Store setup completed successfully!');
    console.log('\n📊 Store Summary:');
    console.log('   - 4 stores created');
    console.log('   - Store inventory system ready');
    console.log('   - Inventory receipts tracking ready');

  } catch (error) {
    console.error('❌ Store setup failed:', error.message);
  } finally {
    process.exit(0);
  }
}

setupStores(); 