const connection = require('./database/db');

async function fixFaultyProductsForeignKey() {
  try {
    console.log('🔧 Fixing foreign key constraints in faulty_products_reports table...');
    
    // Drop existing foreign key constraints
    console.log('📝 Dropping existing foreign key constraints...');
    await connection.query(`
      ALTER TABLE faulty_products_reports 
      DROP FOREIGN KEY faulty_products_reports_ibfk_2
    `);
    console.log('✅ Dropped reported_by foreign key constraint');
    
    await connection.query(`
      ALTER TABLE faulty_products_reports 
      DROP FOREIGN KEY faulty_products_reports_ibfk_3
    `);
    console.log('✅ Dropped assigned_to foreign key constraint');
    
    // Add new foreign key constraints that reference staff table
    console.log('📝 Adding new foreign key constraints...');
    await connection.query(`
      ALTER TABLE faulty_products_reports 
      ADD CONSTRAINT fk_faulty_products_reports_reported_by 
      FOREIGN KEY (reported_by) REFERENCES staff(id) ON DELETE RESTRICT ON UPDATE CASCADE
    `);
    console.log('✅ Added reported_by foreign key constraint (references staff)');
    
    await connection.query(`
      ALTER TABLE faulty_products_reports 
      ADD CONSTRAINT fk_faulty_products_reports_assigned_to 
      FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✅ Added assigned_to foreign key constraint (references staff)');
    
    // Show the updated table structure
    console.log('\n📋 Updated table structure:');
    const [columns] = await connection.query('DESCRIBE faulty_products_reports');
    console.table(columns);
    
    console.log('\n✅ Successfully fixed foreign key constraints!');
    console.log('The faulty_products_reports table now references the staff table instead of users table.');
    
  } catch (error) {
    console.error('❌ Error fixing foreign key constraints:', error);
    
    // If the foreign key names don't exist, try to find the correct names
    if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
      console.log('\n🔍 Trying to find the correct foreign key names...');
      try {
        const [constraints] = await connection.query(`
          SELECT 
            CONSTRAINT_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'faulty_products_reports'
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        
        console.log('📋 Current foreign key constraints:');
        console.table(constraints);
        
        if (constraints.length > 0) {
          console.log('\n💡 You may need to manually drop these constraints first:');
          constraints.forEach(constraint => {
            console.log(`ALTER TABLE faulty_products_reports DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME};`);
          });
        }
      } catch (lookupError) {
        console.error('❌ Error looking up constraints:', lookupError);
      }
    }
  } finally {
    await connection.end();
  }
}

fixFaultyProductsForeignKey(); 