const db = require('./database/db');

async function checkARAccounts() {
  try {
    console.log('Checking for Accounts Receivable accounts...');
    
    // Check for accounts with code 1100
    const [code1100] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_code = '1100'");
    console.log('\nAccounts with code 1100:');
    console.table(code1100);
    
    // Check for accounts with "receivable" in name
    const [receivableAccounts] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_name LIKE '%receivable%'");
    console.log('\nAccounts with "receivable" in name:');
    console.table(receivableAccounts);
    
    // Check for accounts with "AR" in name
    const [arAccounts] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_name LIKE '%AR%'");
    console.log('\nAccounts with "AR" in name:');
    console.table(arAccounts);
    
    // Check all accounts with account_type = 2 (receivables)
    const [type2Accounts] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_type = 2");
    console.log('\nAll accounts with account_type = 2 (receivables):');
    console.table(type2Accounts);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkARAccounts(); 