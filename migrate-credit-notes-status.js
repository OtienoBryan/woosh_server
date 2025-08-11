const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateCreditNotesStatus() {
  let connection;

  try {
    // Create connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_finance'
    });

    console.log('Connected to database');

    // Check if my_status column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'credit_notes' 
      AND COLUMN_NAME = 'my_status'
      AND TABLE_SCHEMA = DATABASE()
    `);

    if (columns.length === 0) {
      console.log('Adding my_status column to credit_notes table...');
      
      // Add my_status column
      await connection.query('ALTER TABLE credit_notes ADD COLUMN my_status TINYINT DEFAULT 0');
      console.log('✅ my_status column added successfully');

      // Update existing records
      console.log('Updating existing credit notes...');
      
      const [activeUpdate] = await connection.query(`
        UPDATE credit_notes 
        SET my_status = 0 
        WHERE status = 'active' AND my_status IS NULL
      `);
      console.log(`✅ Updated ${activeUpdate.affectedRows} active credit notes to my_status = 0`);

      const [appliedUpdate] = await connection.query(`
        UPDATE credit_notes 
        SET my_status = 2 
        WHERE status = 'applied' AND my_status IS NULL
      `);
      console.log(`✅ Updated ${appliedUpdate.affectedRows} applied credit notes to my_status = 2`);

      const [cancelledUpdate] = await connection.query(`
        UPDATE credit_notes 
        SET my_status = 3 
        WHERE status = 'cancelled' AND my_status IS NULL
      `);
      console.log(`✅ Updated ${cancelledUpdate.affectedRows} cancelled credit notes to my_status = 3`);

    } else {
      console.log('✅ my_status column already exists in credit_notes table');
    }

    // Check current status
    const [statusCheck] = await connection.query(`
      SELECT 
        my_status,
        COUNT(*) as count,
        CASE 
          WHEN my_status = 0 THEN 'New/Unprocessed'
          WHEN my_status = 1 THEN 'Processed/Received Back'
          WHEN my_status = 2 THEN 'Applied to Account'
          WHEN my_status = 3 THEN 'Cancelled'
          ELSE 'Unknown'
        END as status_name
      FROM credit_notes 
      GROUP BY my_status
      ORDER BY my_status
    `);

    console.log('\n📊 Current credit note status distribution:');
    statusCheck.forEach(row => {
      console.log(`  ${row.status_name}: ${row.count} credit notes`);
    });

    console.log('\n✅ Credit notes migration completed successfully');

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the migration
migrateCreditNotesStatus()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
