const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function setupCategories() {
  try {
    console.log('🚀 Setting up Product Categories...');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'category_schema.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        const preview = statement.trim().substring(0, 60) + '...';
        console.log('Executing:', preview);
        try {
          await db.query(statement);
          console.log('✅ Success');
        } catch (err) {
          // Some statements might fail if already exists, log but continue
          if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️  Already exists, skipping');
          } else {
            console.error('❌ Error:', err.message);
          }
        }
      }
    }
    
    console.log('\n✅ Product Categories setup completed successfully!');
    
    // Display current categories
    const [categories] = await db.query('SELECT id, name, orderIndex FROM Category ORDER BY orderIndex, name');
    console.log('\n📋 Current Categories:');
    console.table(categories);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up categories:', error);
    process.exit(1);
  }
}

setupCategories();

