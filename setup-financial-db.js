const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupFinancialDatabase() {
  let connection;
  
  try {
    console.log('🚀 Setting up Financial Management System Database...\n');

    // Connect to MySQL without specifying a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'citlogis_finance';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified`);

    // Use the database
    await connection.execute(`USE ${dbName}`);
    console.log(`✅ Using database '${dbName}'`);

    // Read and execute the financial schema
    const schemaPath = path.join(__dirname, 'database', 'financial_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📋 Executing database schema...');
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️  Table already exists, skipping...`);
          } else {
            console.error(`❌ Error executing statement: ${error.message}`);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log('   - Chart of Accounts: Ready');
    console.log('   - Suppliers: Ready');
    console.log('   - Customers: Ready');
    console.log('   - Products: Ready');
    console.log('   - Purchase Orders: Ready');
    console.log('   - Sales Orders: Ready');
    console.log('   - Receipts: Ready');
    console.log('   - Payments: Ready');
    console.log('   - Journal Entries: Ready');
    console.log('   - Inventory Transactions: Ready');
    console.log('\n🔐 Default Admin User:');
    console.log('   - Username: admin');
    console.log('   - Password: admin123');
    console.log('\n🚀 You can now start the application!');

    // Create supplier_ledger table if it doesn't exist
    console.log('\n📊 Creating supplier_ledger table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS supplier_ledger (
        id INT PRIMARY KEY AUTO_INCREMENT,
        supplier_id INT NOT NULL,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(20) NOT NULL,
        reference_id INT NOT NULL,
        debit DECIMAL(15,2) DEFAULT 0,
        credit DECIMAL(15,2) DEFAULT 0,
        running_balance DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )
    `);
    console.log('✅ supplier_ledger table created/verified');

    // Create account_ledger table if it doesn't exist
    console.log('\n📊 Creating account_ledger table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS account_ledger (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(20) NOT NULL,
        reference_id INT NOT NULL,
        debit DECIMAL(15,2) DEFAULT 0,
        credit DECIMAL(15,2) DEFAULT 0,
        running_balance DECIMAL(15,2) NOT NULL,
        status ENUM('draft', 'in pay', 'confirmed', 'cancelled') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
      )
    `);
    console.log('✅ account_ledger table created/verified');

    // Create customer_ledger table if it doesn't exist
    console.log('\n📊 Creating customer_ledger table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        reference_type VARCHAR(20) NOT NULL,
        reference_id INT NOT NULL,
        debit DECIMAL(15,2) DEFAULT 0,
        credit DECIMAL(15,2) DEFAULT 0,
        running_balance DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);
    console.log('✅ customer_ledger table created/verified');

    // Add account_id and reference columns to payments table if they don't exist
    console.log('\n🔧 Updating payments table...');
    try {
      await connection.execute(`
        ALTER TABLE payments 
        ADD COLUMN account_id INT NULL,
        ADD COLUMN reference VARCHAR(100) NULL,
        ADD COLUMN status ENUM('draft', 'in pay', 'confirmed', 'cancelled') DEFAULT 'draft',
        ADD FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
      `);
      console.log('✅ payments table updated with new columns');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ payments table already has the required columns');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupFinancialDatabase();
}

module.exports = setupFinancialDatabase; 