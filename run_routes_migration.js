const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function runRoutesMigration() {
  try {
    console.log('Starting routes table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'update_routes_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await db.query(statement);
      }
    }
    
    console.log('Routes table migration completed successfully!');
    
    // Verify the table structure
    const [columns] = await db.query('DESCRIBE routes');
    console.log('Current routes table structure:');
    console.table(columns);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the database connection
    if (db.end) {
      db.end();
    }
  }
}

// Run the migration
runRoutesMigration();
