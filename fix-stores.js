const mysql = require('mysql2/promise');

async function fixStores() {
  let connection;

  try {
    console.log('Attempting to connect to database...');
    
    // Try to connect to the database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'retail_finance'
    });

    console.log('✅ Connected to database successfully');

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
    } else {
      console.log('Stores table already exists');
    }

    // Check stores
    const [stores] = await connection.query('SELECT * FROM stores');
    console.log('Current stores:', stores);

    // Check if store_inventory table exists
    const [inventoryTables] = await connection.query('SHOW TABLES LIKE "store_inventory"');
    console.log('Store inventory table exists:', inventoryTables.length > 0);

    if (inventoryTables.length === 0) {
      console.log('Creating store_inventory table...');
      await connection.query(`
        CREATE TABLE store_inventory (
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
      console.log('✅ Store inventory table created');
    }

    // Check if inventory_receipts table exists
    const [receiptsTables] = await connection.query('SHOW TABLES LIKE "inventory_receipts"');
    console.log('Inventory receipts table exists:', receiptsTables.length > 0);

    if (receiptsTables.length === 0) {
      console.log('Creating inventory_receipts table...');
      await connection.query(`
        CREATE TABLE inventory_receipts (
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
      console.log('✅ Inventory receipts table created');
    }

    console.log('✅ All tables created successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('Database does not exist. Please create the database first.');
    } else if (error.code === 'ECONNREFUSED') {
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

fixStores(); 