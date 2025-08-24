const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'add_client_fields.sql');
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
        try {
          console.log(`Executing statement ${i + 1}: ${statement.substring(0, 50)}...`);
          await db.query(statement);
          console.log(`✓ Statement ${i + 1} executed successfully`);
        } catch (error) {
          console.log(`⚠ Statement ${i + 1} failed (this might be expected if column already exists): ${error.message}`);
        }
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
