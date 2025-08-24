const db = require('./database/db');
const fs = require('fs');
const path = require('path');

async function runJourneyPlanMigration() {
  try {
    console.log('Starting JourneyPlan table migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'database', 'create_journey_plan_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 70)}...`);
        await db.query(statement);
      }
    }

    console.log('JourneyPlan table migration completed successfully.');
    
    // Verify the table was created
    const [tables] = await db.query('SHOW TABLES LIKE "JourneyPlan"');
    if (tables.length > 0) {
      console.log('✅ JourneyPlan table exists');
      
      // Show table structure
      const [columns] = await db.query('DESCRIBE JourneyPlan');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } else {
      console.log('❌ JourneyPlan table was not created');
    }
    
  } catch (error) {
    console.error('JourneyPlan table migration failed:', error);
    process.exit(1);
  } finally {
    if (db.end) {
      await db.end();
    }
  }
}

runJourneyPlanMigration();
