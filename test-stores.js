const mysql = require('mysql2/promise');

async function testStores() {
  let connection;

  try {
    // Try to connect to the database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'retail_finance'
    });

    console.log('Connected to database successfully');

    // Check if stores table exists
    const [tables] = await connection.query('SHOW TABLES LIKE "stores"');
    console.log('Stores table exists:', tables.length > 0);

    if (tables.length === 0) {
      console.log('Creating stores table...');
      
      // Create stores table
      await connection.query(`
        CREATE TABLE stores (
          id INT PRIMARY KEY AUTO_INCREMENT,
          store_code VARCHAR(20) UNIQUE NOT NULL,
          store_name VARCHAR(100) NOT NULL,
          address TEXT,
          phone VARCHAR(20),
          manager_name VARCHAR(100),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('Stores table created');

      // Insert default stores
      await connection.query(`
        INSERT INTO stores (store_code, store_name, address, phone, manager_name) VALUES
        ('STORE1', 'Main Branch', '123 Main Street, Downtown, City', '+1-555-1001', 'John Manager'),
        ('STORE2', 'Downtown Store', '456 Downtown Avenue, City Center', '+1-555-1002', 'Sarah Johnson'),
        ('STORE3', 'Uptown Store', '789 Uptown Boulevard, Uptown District', '+1-555-1003', 'Mike Chen'),
        ('STORE4', 'Warehouse Store', '101 Warehouse Road, Industrial Zone', '+1-555-1004', 'Lisa Brown')
      `);
      console.log('Default stores inserted');
    }

    // Check stores
    const [stores] = await connection.query('SELECT * FROM stores');
    console.log('Current stores:', stores);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
}

testStores(); 