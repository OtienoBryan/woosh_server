const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runContractDescriptionMigration() {
  let connection;
  
  try {
    console.log('Starting contract description migration...');

    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_finance',
      multipleStatements: true
    });

    console.log('✅ Connected to database successfully');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'add_contract_description.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');
    await connection.execute(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify the column was added
    const [columns] = await connection.execute('DESCRIBE employee_contracts');
    const hasDescription = columns.some((col: any) => col.Field === 'description');
    
    if (hasDescription) {
      console.log('✅ description column exists in employee_contracts table');
      const descColumn = columns.find((col: any) => col.Field === 'description');
      console.log(`📋 Column details: ${descColumn.Field} - ${descColumn.Type} ${descColumn.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    } else {
      console.log('⚠️  description column not found in employee_contracts table');
    }
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  description column already exists, skipping migration.');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error('Error details:', error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runContractDescriptionMigration();

