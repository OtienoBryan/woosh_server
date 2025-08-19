const db = require('./database/db');

async function checkAndUpdateDatabaseStructure() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('=== CHECKING DATABASE STRUCTURE ===\n');
    
    // Check if Clients table has balance column
    console.log('1. Checking Clients table structure...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Clients'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Current Clients table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    const hasBalanceColumn = columns.some(col => col.COLUMN_NAME === 'balance');
    
    if (!hasBalanceColumn) {
      console.log('\n2. Adding balance column to Clients table...');
      await connection.execute(`
        ALTER TABLE Clients 
        ADD COLUMN balance DECIMAL(15,2) DEFAULT 0
      `);
      console.log('✅ Balance column added successfully');
    } else {
      console.log('\n2. ✅ Balance column already exists');
    }
    
    // Check if client_ledger table exists
    console.log('\n3. Checking client_ledger table...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'client_ledger'
    `);
    
    if (tables.length === 0) {
      console.log('❌ client_ledger table does not exist');
      console.log('Creating client_ledger table...');
      
      await connection.execute(`
        CREATE TABLE client_ledger (
          id INT PRIMARY KEY AUTO_INCREMENT,
          client_id INT NOT NULL,
          date DATE NOT NULL,
          description TEXT NOT NULL,
          reference_type VARCHAR(20) NOT NULL,
          reference_id INT NOT NULL,
          debit DECIMAL(15,2) DEFAULT 0,
          credit DECIMAL(15,2) DEFAULT 0,
          running_balance DECIMAL(15,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES Clients(id)
        )
      `);
      console.log('✅ client_ledger table created successfully');
    } else {
      console.log('✅ client_ledger table exists');
    }
    
    // Check sample data
    console.log('\n4. Checking sample data...');
    const [clients] = await connection.query('SELECT id, name, balance FROM Clients LIMIT 5');
    console.log('Sample clients with balances:');
    clients.forEach(client => {
      console.log(`  - ID: ${client.id}, Name: ${client.name}, Balance: ${client.balance || 0}`);
    });
    
    const [ledgerEntries] = await connection.query('SELECT COUNT(*) as count FROM client_ledger');
    console.log(`Total client_ledger entries: ${ledgerEntries[0].count}`);
    
    console.log('\n✅ Database structure check completed');
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

checkAndUpdateDatabaseStructure();
