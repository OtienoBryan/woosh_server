const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'woosh_finance'
  });

  try {
    console.log('Adding start_date and end_date columns to documents table...');
    
    await connection.execute(`
      ALTER TABLE documents 
      ADD COLUMN start_date DATE NULL,
      ADD COLUMN end_date DATE NULL
    `);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Columns already exist, skipping migration.');
    } else {
      console.error('❌ Migration failed:', error.message);
    }
  } finally {
    await connection.end();
  }
}

runMigration();