const db = require('./database/db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupAuditTrail() {
  try {
    console.log('Starting audit trail table setup...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'create_audit_trail_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 70)}...`);
        try {
          await db.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          // Some errors are expected (like table/column already exists)
          if (error.code === 'ER_DUP_FIELDNAME' || 
              error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_DUP_KEY' ||
              error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
              error.message.includes('Duplicate column name') ||
              error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('Audit trail table setup completed successfully.');
    
    // Verify the table was created
    const [tables] = await db.query("SHOW TABLES LIKE 'audit_trail'");
    if (tables.length > 0) {
      console.log('✅ audit_trail table exists');
      
      // Show table structure
      const [columns] = await db.query('DESCRIBE audit_trail');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } else {
      console.log('❌ audit_trail table was not created');
    }
    
  } catch (error) {
    console.error('Audit trail setup failed:', error);
    process.exit(1);
  } finally {
    // Don't close the connection pool, it's shared
    process.exit(0);
  }
}

setupAuditTrail();
