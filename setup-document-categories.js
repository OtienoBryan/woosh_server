const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupDocumentCategories() {
  try {
    console.log('🚀 Setting up document categories...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'create-document-categories-table.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await db.query(statement);
      }
    }
    
    console.log('✅ Document categories setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up document categories:', error);
    process.exit(1);
  }
}

setupDocumentCategories();
