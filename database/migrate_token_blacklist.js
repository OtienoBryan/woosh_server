/**
 * Migration script to create token_blacklist table
 * Run this script to set up token blacklisting functionality
 * 
 * Usage: node server/database/migrate_token_blacklist.js
 */

const db = require('./db');
const fs = require('fs');
const path = require('path');

async function migrateTokenBlacklist() {
  try {
    console.log('Starting token blacklist migration...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create_token_blacklist_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await db.query(sql);
    
    console.log('✅ Token blacklist table created successfully!');
    console.log('');
    console.log('The token_blacklist table is now ready to store invalidated tokens.');
    console.log('Tokens will be automatically blacklisted when users log out.');
    console.log('');
    console.log('Note: You may want to set up a scheduled job to clean up expired tokens:');
    console.log('DELETE FROM token_blacklist WHERE expires_at < NOW();');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Check if table already exists
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
      console.log('');
      console.log('ℹ️  Token blacklist table already exists. Migration not needed.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

// Run migration
migrateTokenBlacklist();
