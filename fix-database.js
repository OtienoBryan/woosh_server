const db = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database schema issues...\n');

    // Read and execute the fix script
    const fixPath = path.join(__dirname, 'fix-inventory-receipts.sql');
    const fixScript = await fs.readFile(fixPath, 'utf8');
    
    // Split the script into individual statements
    const statements = fixScript
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📋 Executing database fixes...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.query(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️  Column/Constraint already exists, skipping...`);
          } else {
            console.error(`❌ Error executing statement: ${error.message}`);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('\n✅ Database fixes completed successfully!');

  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
  } finally {
    process.exit(0);
  }
}

fixDatabase(); 