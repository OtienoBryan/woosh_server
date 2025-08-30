const db = require('./database/db');

async function checkAndCreateReceiptsTable() {
  const connection = await db.getConnection();
  
  try {
    // Check if receipts table exists
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receipts'
    `);
    
    if (tables.length === 0) {
      console.log('Receipts table does not exist. Creating it...');
      
      // Create receipts table
      await connection.query(`
        CREATE TABLE receipts (
          id INT PRIMARY KEY AUTO_INCREMENT,
          receipt_number VARCHAR(20) UNIQUE NOT NULL,
          client_id INT NOT NULL,
          receipt_date DATE NOT NULL,
          payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card') NOT NULL,
          reference VARCHAR(50),
          invoice_number VARCHAR(50),
          amount DECIMAL(15,2) NOT NULL,
          notes TEXT,
          created_by INT NOT NULL,
          account_id INT,
          status ENUM('in pay', 'confirmed', 'cancelled') DEFAULT 'in pay',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES Clients(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )
      `);
      
      console.log('Receipts table created successfully!');
    } else {
      console.log('Receipts table already exists.');
    }
    
    // Check if Clients table exists
    const [clientTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Clients'
    `);
    
    if (clientTables.length === 0) {
      console.log('ERROR: Clients table does not exist!');
    } else {
      console.log('Clients table exists.');
    }
    
    // Check if users table exists
    const [userTables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
    `);
    
    if (userTables.length === 0) {
      console.log('ERROR: users table does not exist!');
    } else {
      console.log('users table exists.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

checkAndCreateReceiptsTable();
