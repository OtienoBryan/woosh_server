const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'woosh_finance',
      multipleStatements: true // Allow multiple SQL statements
    });

    console.log('✅ Connected to database successfully');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'add-received-fields-to-credit-notes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📝 Running migration: add-received-fields-to-credit-notes.sql');
    console.log('📋 SQL Content:');
    console.log(sqlContent);

    // Execute the migration
    const [results] = await connection.execute(sqlContent);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Results:', results);

    // Verify the new columns exist
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'credit_notes' 
      AND COLUMN_NAME IN ('received_by', 'received_at')
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'woosh_finance']);

    console.log('🔍 Verification - New columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Columns already exist, skipping...');
    } else if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️  Indexes already exist, skipping...');
    } else if (error.code === 'ER_CANNOT_ADD_FOREIGN') {
      console.log('⚠️  Foreign key constraint failed. This might be due to:');
      console.log('   - Users table not existing');
      console.log('   - Different table structure');
      console.log('   - Permission issues');
    } else {
      console.error('🔍 Full error details:', error);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runMigration().catch(console.error);
