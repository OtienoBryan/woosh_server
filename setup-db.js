const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function setupDatabase() {
  let connection;

  try {
    // Create connection without database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'bm_admin_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database '${dbName}' created or already exists`);

    // Use the database
    await connection.query(`USE ${dbName}`);
    console.log(`Using database '${dbName}'`);

    // Read and execute all SQL files
    const sqlFiles = [
      'database/schema.sql',
      'database/financial_schema.sql',
      'database/store_schema.sql'
    ];

    for (const sqlFile of sqlFiles) {
      try {
        console.log(`Executing ${sqlFile}...`);
        const sqlFilePath = path.join(__dirname, sqlFile);
        const sql = await fs.readFile(sqlFilePath, 'utf8');
        
        // Split the SQL file into individual statements
        const statements = sql
          .split(';')
          .filter(statement => statement.trim())
          .map(statement => statement + ';');

        // Execute each statement
        for (const statement of statements) {
          try {
            if (statement.trim() && statement.trim() !== ';') {
              await connection.query(statement);
              console.log('Executed SQL statement successfully');
            }
          } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
              console.log('Duplicate entry - skipping');
            } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
              console.log('Table already exists - skipping');
            } else {
              console.error('Error executing statement:', error);
              throw error;
            }
          }
        }
        console.log(`Completed ${sqlFile}`);
      } catch (error) {
        console.error(`Error processing ${sqlFile}:`, error);
        throw error;
      }
    }

    // Create admin user with hashed password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['admin', 'admin@example.com', hashedPassword, 'admin', hashedPassword]
    );

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('Database setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database setup failed:', error);
    process.exit(1);
  }); 