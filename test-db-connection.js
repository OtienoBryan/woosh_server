const mysql = require('mysql2/promise');

async function testConnection() {
  let connection;

  try {
    console.log('Testing database connection...');
    
    // Try to connect without specifying database first
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    console.log('✅ Connected to MySQL server');

    // Check if database exists
    const [databases] = await connection.query('SHOW DATABASES');
    const dbNames = databases.map(db => db.Database);
    console.log('Available databases:', dbNames);

    const targetDb = 'retail_finance';
    if (!dbNames.includes(targetDb)) {
      console.log(`❌ Database '${targetDb}' does not exist`);
      console.log('Creating database...');
      await connection.query(`CREATE DATABASE ${targetDb}`);
      console.log(`✅ Database '${targetDb}' created`);
    } else {
      console.log(`✅ Database '${targetDb}' exists`);
    }

    // Use the database
    await connection.query(`USE ${targetDb}`);
    console.log(`Using database '${targetDb}'`);

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
      console.log('✅ Stores table created');

      // Insert default stores
      await connection.query(`
        INSERT INTO stores (store_code, store_name, address, phone, manager_name) VALUES
        ('STORE1', 'Main Branch', '123 Main Street, Downtown, City', '+1-555-1001', 'John Manager'),
        ('STORE2', 'Downtown Store', '456 Downtown Avenue, City Center', '+1-555-1002', 'Sarah Johnson'),
        ('STORE3', 'Uptown Store', '789 Uptown Boulevard, Uptown District', '+1-555-1003', 'Mike Chen'),
        ('STORE4', 'Warehouse Store', '101 Warehouse Road, Industrial Zone', '+1-555-1004', 'Lisa Brown')
      `);
      console.log('✅ Default stores inserted');
    }

    // Check stores
    const [stores] = await connection.query('SELECT * FROM stores');
    console.log('Current stores:', stores);

    console.log('✅ Database test completed successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('Cannot connect to MySQL. Please make sure MySQL is running.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Access denied. Please check your MySQL username and password.');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
}

testConnection(); 