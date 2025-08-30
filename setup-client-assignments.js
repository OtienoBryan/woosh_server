const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupClientAssignments() {
  try {
    console.log('Setting up ClientAssignment table...');
    
    // Read the SQL script
    const sqlPath = path.join(__dirname, 'create_client_assignments_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await db.query(sql);
    console.log('ClientAssignment table created successfully!');
    
    // Verify the table was created
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ClientAssignment'
    `);
    
    if (tables.length > 0) {
      console.log('✅ ClientAssignment table verified in database');
      
      // Show table structure
      const [columns] = await db.query('DESCRIBE ClientAssignment');
      console.log('\nTable structure:');
      columns.forEach(col => {
        console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } else {
      console.log('❌ ClientAssignment table not found in database');
    }
    
  } catch (error) {
    console.error('Error setting up ClientAssignment table:', error);
  } finally {
    process.exit(0);
  }
}

setupClientAssignments();
