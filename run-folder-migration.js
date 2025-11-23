const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runFolderMigration() {
  let connection;
  
  try {
    console.log('Starting document folders migration...');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_finance',
      multipleStatements: true // Allow multiple SQL statements
    });

    console.log('✅ Connected to database successfully');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'add_folders_support.sql');
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
          await connection.execute(statement);
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

    console.log('Document folders migration completed successfully.');
    
    // Verify the table was created
    const [tables] = await connection.execute("SHOW TABLES LIKE 'document_folders'");
    if (tables.length > 0) {
      console.log('✅ document_folders table exists');
      
      // Show table structure
      const [columns] = await connection.execute('DESCRIBE document_folders');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } else {
      console.log('❌ document_folders table was not created');
    }

    // Check if parent_folder_id column exists in documents table
    try {
      const [docColumns] = await connection.execute('DESCRIBE documents');
      const hasParentFolderId = docColumns.some(col => col.Field === 'parent_folder_id');
      if (hasParentFolderId) {
        console.log('✅ parent_folder_id column exists in documents table');
      } else {
        console.log('⚠️  parent_folder_id column not found in documents table');
      }
    } catch (error) {
      console.log('⚠️  Could not check documents table structure:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Document folders migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runFolderMigration();

