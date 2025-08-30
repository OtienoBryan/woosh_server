const db = require('./database/db');

async function setupMerchandiseAssignments() {
  try {
    console.log('Setting up merchandise assignments table...');
    
    // Create merchandise_assignments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS merchandise_assignments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        merchandise_id INT NOT NULL,
        staff_id INT NOT NULL,
        quantity_assigned INT NOT NULL,
        date_assigned DATE NOT NULL,
        comment TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (merchandise_id) REFERENCES merchandise(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        INDEX idx_merchandise_id (merchandise_id),
        INDEX idx_staff_id (staff_id),
        INDEX idx_date_assigned (date_assigned)
      )
    `);
    
    console.log('✅ Merchandise assignments table created successfully!');
    
    // Check if table was created
    const [tables] = await db.execute('SHOW TABLES LIKE "merchandise_assignments"');
    if (tables.length > 0) {
      console.log('✅ Table verification successful');
      
      // Show table structure
      const [columns] = await db.execute('DESCRIBE merchandise_assignments');
      console.log('\nTable structure:');
      columns.forEach(col => {
        console.log(`  ${col.Field} - ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error setting up merchandise assignments table:', error);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupMerchandiseAssignments();
