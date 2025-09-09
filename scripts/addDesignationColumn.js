const db = require('../database/db');

async function addDesignationColumn() {
  try {
    console.log('Starting designation column migration...');
    
    // Check if designation column already exists
    const [columns] = await db.query("SHOW COLUMNS FROM staff LIKE 'designation'");
    
    if (columns.length > 0) {
      console.log('Designation column already exists. Skipping migration.');
      return;
    }
    
    // Add designation column
    console.log('Adding designation column to staff table...');
    await db.query('ALTER TABLE staff ADD COLUMN designation VARCHAR(255) AFTER role');
    
    // Update existing records to populate designation from role
    console.log('Populating designation column with existing role values...');
    await db.query("UPDATE staff SET designation = role WHERE designation IS NULL OR designation = ''");
    
    // Add index for better performance
    console.log('Adding index for designation column...');
    await db.query('CREATE INDEX idx_staff_designation ON staff(designation)');
    
    console.log('Designation column migration completed successfully!');
    
    // Verify the column was added
    const [newColumns] = await db.query("SHOW COLUMNS FROM staff LIKE 'designation'");
    if (newColumns.length > 0) {
      console.log('✅ Designation column verified and ready to use.');
    } else {
      console.log('❌ Error: Designation column was not created.');
    }
    
  } catch (error) {
    console.error('Error during designation column migration:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addDesignationColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addDesignationColumn;
