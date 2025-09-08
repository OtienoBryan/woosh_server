const db = require('./database/db');

async function setupUpliftSalesTable() {
  try {
    console.log('Setting up UpliftSale table...');

    // Create UpliftSale table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS UpliftSale (
        id INT(11) NOT NULL AUTO_INCREMENT,
        clientId INT(11) NOT NULL,
        userId INT(11) NOT NULL,
        status VARCHAR(191) NOT NULL DEFAULT 'pending',
        totalAmount DOUBLE NOT NULL DEFAULT 0,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        KEY idx_clientId (clientId),
        KEY idx_userId (userId),
        KEY idx_status (status),
        KEY idx_createdAt (createdAt),
        CONSTRAINT fk_uplift_sale_client FOREIGN KEY (clientId) REFERENCES Clients(id) ON DELETE CASCADE,
        CONSTRAINT fk_uplift_sale_user FOREIGN KEY (userId) REFERENCES SalesRep(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.execute(createTableQuery);
    console.log('UpliftSale table created successfully!');

    // Insert some sample data (optional)
    const sampleDataQuery = `
      INSERT IGNORE INTO UpliftSale (clientId, userId, status, totalAmount, createdAt) VALUES
      (1, 1, 'pending', 50000.00, NOW()),
      (2, 1, 'approved', 75000.00, NOW()),
      (3, 2, 'completed', 100000.00, NOW()),
      (1, 2, 'rejected', 25000.00, NOW());
    `;

    await db.execute(sampleDataQuery);
    console.log('Sample data inserted successfully!');

  } catch (error) {
    console.error('Error setting up UpliftSale table:', error);
    throw error;
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupUpliftSalesTable()
    .then(() => {
      console.log('UpliftSale table setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupUpliftSalesTable;
