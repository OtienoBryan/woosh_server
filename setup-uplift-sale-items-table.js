const db = require('./database/db');

async function setupUpliftSaleItemsTable() {
  try {
    console.log('Setting up UpliftSaleItem table...');

    // Create UpliftSaleItem table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS UpliftSaleItem (
        id INT(11) NOT NULL AUTO_INCREMENT,
        upliftSaleId INT(11) NOT NULL,
        productId INT(11) NOT NULL,
        quantity INT(11) NOT NULL,
        unitPrice DOUBLE NOT NULL,
        total DOUBLE NOT NULL,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_upliftSaleId (upliftSaleId),
        KEY idx_productId (productId),
        KEY idx_createdAt (createdAt),
        CONSTRAINT fk_uplift_sale_item_sale FOREIGN KEY (upliftSaleId) REFERENCES UpliftSale(id) ON DELETE CASCADE,
        CONSTRAINT fk_uplift_sale_item_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.execute(createTableQuery);
    console.log('UpliftSaleItem table created successfully!');

    // Insert some sample data (optional)
    const sampleDataQuery = `
      INSERT IGNORE INTO UpliftSaleItem (upliftSaleId, productId, quantity, unitPrice, total, createdAt) VALUES
      (1, 1, 5, 1000.00, 5000.00, NOW()),
      (1, 2, 3, 1500.00, 4500.00, NOW()),
      (2, 1, 10, 1000.00, 10000.00, NOW()),
      (2, 3, 2, 2000.00, 4000.00, NOW()),
      (3, 2, 8, 1500.00, 12000.00, NOW()),
      (3, 4, 4, 2500.00, 10000.00, NOW());
    `;

    await db.execute(sampleDataQuery);
    console.log('Sample data inserted successfully!');

  } catch (error) {
    console.error('Error setting up UpliftSaleItem table:', error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupUpliftSaleItemsTable()
    .then(() => {
      console.log('UpliftSaleItem table setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupUpliftSaleItemsTable;
