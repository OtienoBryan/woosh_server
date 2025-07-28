const db = require('./database/db');

async function createARAccount() {
  try {
    console.log('Creating Accounts Receivable account...');
    
    // First check the table structure
    const [columns] = await db.query("DESCRIBE chart_of_accounts");
    console.log('Chart of accounts table structure:');
    console.table(columns);
    
    // Check for the highest account code to determine next code
    const [maxCode] = await db.query("SELECT MAX(CAST(account_code AS UNSIGNED)) as max_code FROM chart_of_accounts");
    const nextCode = (parseInt(maxCode[0].max_code) + 1).toString().padStart(6, '0');
    
    console.log(`Next available account code: ${nextCode}`);
    
    // Create Accounts Receivable account (without status column)
    const [result] = await db.query(
      `INSERT INTO chart_of_accounts (account_code, account_name, account_type, description) 
       VALUES (?, ?, ?, ?)`,
      [
        '1100', // Standard accounts receivable code
        'Accounts Receivable',
        2, // account_type = 2 for receivables
        'Amounts owed by customers for goods or services provided'
      ]
    );
    
    console.log('Accounts Receivable account created successfully!');
    console.log('Account ID:', result.insertId);
    console.log('Account Code: 1100');
    console.log('Account Name: Accounts Receivable');
    console.log('Account Type: 2 (Receivables)');
    
    // Verify the account was created
    const [verify] = await db.query("SELECT * FROM chart_of_accounts WHERE account_code = '1100'");
    console.log('\nVerification - Created account:');
    console.table(verify);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating accounts receivable account:', error);
    process.exit(1);
  }
}

createARAccount(); 