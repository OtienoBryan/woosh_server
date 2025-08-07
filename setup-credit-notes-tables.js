const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupCreditNotesTables() {
  try {
    console.log('Setting up credit notes tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'create_credit_notes_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon to get individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
        console.log('Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('Credit notes tables setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up credit notes tables:', error);
    process.exit(1);
  }
}

setupCreditNotesTables(); 