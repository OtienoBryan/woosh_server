const connection = require('./database/db');

async function checkMyAssetsSchema() {
  try {
    console.log('Checking my_assets table schema...\n');
    
    // Check if table exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'my_assets'
    `);
    
    if (tables.length === 0) {
      console.log('Table "my_assets" does not exist.');
      console.log('Available tables:');
      const [allTables] = await connection.query('SHOW TABLES');
      allTables.forEach(table => {
        console.log(`- ${Object.values(table)[0]}`);
      });
      return;
    }
    
    // Get table structure
    const [columns] = await connection.query(`
      DESCRIBE my_assets
    `);
    
    console.log('my_assets table structure:');
    console.log('=======================');
    console.log('Field\t\tType\t\tNull\tKey\tDefault\tExtra');
    console.log('-----\t\t----\t\t----\t---\t-------\t-----');
    
    columns.forEach(column => {
      console.log(`${column.Field}\t\t${column.Type}\t\t${column.Null}\t${column.Key}\t${column.Default || 'NULL'}\t${column.Extra || ''}`);
    });
    
    // Get table creation SQL
    const [createTable] = await connection.query(`
      SHOW CREATE TABLE my_assets
    `);
    
    console.log('\n\nCREATE TABLE statement:');
    console.log('======================');
    console.log(createTable[0]['Create Table']);
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    process.exit(0);
  }
}

checkMyAssetsSchema(); 