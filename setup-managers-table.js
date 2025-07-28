const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupManagersTable() {
  try {
    console.log('Setting up managers table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'setup_complete_sales_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim());
        await db.query(statement);
      }
    }
    
    console.log('Managers table setup completed successfully!');
    
    // Verify the table was created
    const [rows] = await db.query('SELECT * FROM managers');
    console.log(`Found ${rows.length} managers in the table:`, rows);
    
  } catch (error) {
    console.error('Error setting up managers table:', error);
  } finally {
    process.exit(0);
  }
}

setupManagersTable(); 