const connection = require('./database/db');

async function updateMyAssetsTable() {
  try {
    console.log('🔧 Updating my_assets table structure...');

    // Check if document_url column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'my_assets' 
      AND COLUMN_NAME = 'document_url'
    `);

    if (columns.length === 0) {
      // Add document_url column if it doesn't exist
      console.log('📝 Adding document_url column...');
      await connection.query(`
        ALTER TABLE my_assets 
        ADD COLUMN document_url TEXT NULL
      `);
      console.log('✅ document_url column added successfully');
    } else {
      // Modify existing column to be nullable
      console.log('📝 Modifying document_url column to be nullable...');
      await connection.query(`
        ALTER TABLE my_assets 
        MODIFY COLUMN document_url TEXT NULL
      `);
      console.log('✅ document_url column updated successfully');
    }

    // Show the updated table structure
    console.log('\n📋 Updated table structure:');
    const [structure] = await connection.query('DESCRIBE my_assets');
    console.table(structure);

    console.log('\n✅ my_assets table updated successfully!');
  } catch (error) {
    console.error('❌ Error updating my_assets table:', error);
  } finally {
    await connection.end();
  }
}

updateMyAssetsTable(); 