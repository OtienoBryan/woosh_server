const db = require('./db');

async function setupPayrollTables() {
  try {
    console.log('Setting up payroll tables...');
    
    // Create payroll_history table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        staff_id INT NOT NULL,
        pay_date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        UNIQUE KEY unique_staff_pay_date (staff_id, pay_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ payroll_history table created successfully');
    
    // Check if required chart of accounts exist for payroll
    const [accounts] = await db.query(`
      SELECT id, account_code, account_name 
      FROM chart_of_accounts 
      WHERE account_code IN ('37', '38', '39', '40')
    `);
    
    const requiredAccounts = [
      { code: '37', name: 'PAYE Payable', type: 2 }, // Liability
      { code: '38', name: 'Net Wages', type: 5 },    // Expense
      { code: '39', name: 'NSSF Payable', type: 2 }, // Liability
      { code: '40', name: 'NHIF Payable', type: 2 }  // Liability
    ];
    
    for (const account of requiredAccounts) {
      const exists = accounts.find(a => a.account_code === account.code);
      if (!exists) {
        await db.query(`
          INSERT INTO chart_of_accounts (account_code, account_name, account_type, is_active, created_at)
          VALUES (?, ?, ?, true, NOW())
        `, [account.code, account.name, account.type]);
        console.log(`✅ Created account: ${account.code} - ${account.name}`);
      } else {
        console.log(`ℹ️  Account exists: ${account.code} - ${account.name}`);
      }
    }
    
    console.log('✅ Payroll setup completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error setting up payroll tables:', error);
    process.exit(1);
  }
}

setupPayrollTables();
