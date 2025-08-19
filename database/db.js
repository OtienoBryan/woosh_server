const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'retail_finance',
  waitForConnections: true,
  connectionLimit: 5, // Reduced for serverless
  queueLimit: 0,
  acquireTimeout: 60000, // 60 seconds
  timeout: 60000, // 60 seconds
  reconnect: true,
  ssl: false, // Temporarily disable SSL to test connection
  timezone: '+00:00', // Force UTC timezone
  dateStrings: true // Return dates as strings to avoid timezone conversion
});

// Test database connection and set timezone
pool.getConnection(async (err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  
  try {
    // Set timezone to UTC to ensure consistent time handling
    await connection.query("SET time_zone = '+00:00'");
    console.log('Successfully connected to MySQL database and set timezone to UTC');
  } catch (timezoneErr) {
    console.warn('Warning: Could not set timezone to UTC:', timezoneErr.message);
  }
  
  connection.release();
});

module.exports = pool.promise(); 