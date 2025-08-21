const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupAssetAssignments() {
  try {
    console.log('Setting up asset assignments table...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'asset_assignments_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await db.execute(statement);
      }
    }
    
    console.log('✅ Asset assignments table setup completed successfully!');
    
    // Verify the table was created
    const [tables] = await db.execute('SHOW TABLES LIKE "asset_assignments"');
    if (tables.length > 0) {
      console.log('✅ asset_assignments table exists');
      
      // Show table structure
      const [columns] = await db.execute('DESCRIBE asset_assignments');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    } else {
      console.log('❌ asset_assignments table was not created');
    }
    
  } catch (error) {
    console.error('❌ Error setting up asset assignments table:', error);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupAssetAssignments();
