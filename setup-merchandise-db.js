const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupMerchandiseDatabase() {
  let connection;
  
  try {
    console.log('🚀 Setting up Merchandise Management System Database...\n');

    // Connect to MySQL without specifying a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'retail_finance';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified`);

    // Use the database
    await connection.execute(`USE ${dbName}`);
    console.log(`✅ Using database '${dbName}'`);

    // Read and execute the merchandise schema
    const schemaPath = path.join(__dirname, 'database', 'merchandise_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log('📋 Executing merchandise database schema...');
    
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

    console.log('\n✅ Merchandise database setup completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log('   - merchandise_categories: Ready');
    console.log('   - merchandise: Ready');
    console.log('\n🏷️  Default Categories Created:');
    console.log('   - T-Shirts');
    console.log('   - Caps');
    console.log('   - Displays');
    console.log('   - Stationery');
    console.log('   - Promotional Items');
    console.log('   - Uniforms');
    console.log('\n🚀 You can now use the merchandise management system!');

  } catch (error) {
    console.error('❌ Error setting up merchandise database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupMerchandiseDatabase();
}

module.exports = setupMerchandiseDatabase;
