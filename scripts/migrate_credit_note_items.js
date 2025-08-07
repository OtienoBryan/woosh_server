const db = require('../database/db');
const fs = require('fs');
const path = require('path');

async function migrateCreditNoteItems() {
  const connection = await db.getConnection();
  
  try {
    console.log('Starting migration: Adding invoice_id to credit_note_items table...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/add_invoice_id_to_credit_note_items.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    console.log('The credit_note_items table now supports items from different invoices.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateCreditNoteItems()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateCreditNoteItems; 