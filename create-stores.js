const mysql = require('mysql2/promise');
require('dotenv').config();

async function createStores() {
  let connection;

  try {
    // Create connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'retail_finance'
    });

    console.log('Connected to database');

    // Create stores table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stores (
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
      INSERT IGNORE INTO stores (store_code, store_name, address, phone, manager_name) VALUES
      ('STORE1', 'Main Branch', '123 Main Street, Downtown, City', '+1-555-1001', 'John Manager'),
      ('STORE2', 'Downtown Store', '456 Downtown Avenue, City Center', '+1-555-1002', 'Sarah Johnson'),
      ('STORE3', 'Uptown Store', '789 Uptown Boulevard, Uptown District', '+1-555-1003', 'Mike Chen'),
      ('STORE4', 'Warehouse Store', '101 Warehouse Road, Industrial Zone', '+1-555-1004', 'Lisa Brown')
    `);
    console.log('Default stores inserted');

    // Create store_inventory table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS store_inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        store_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_store_product (store_id, product_id),
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('Store inventory table created');

    // Create inventory_receipts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory_receipts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        purchase_order_id INT NOT NULL,
        product_id INT NOT NULL,
        store_id INT NOT NULL,
        received_quantity INT NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(15,2) NOT NULL,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        received_by INT NOT NULL,
        notes TEXT,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (received_by) REFERENCES users(id)
      )
    `);
    console.log('Inventory receipts table created');

    // Check if stores exist
    const [stores] = await connection.query('SELECT * FROM stores');
    console.log('Current stores:', stores);

    console.log('Stores setup completed successfully');
  } catch (error) {
    console.error('Error setting up stores:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
createStores()
  .then(() => {
    console.log('Stores setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Stores setup failed:', error);
    process.exit(1);
  }); 