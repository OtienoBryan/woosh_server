const db = require('./database/db');

async function checkAccountTypes() {
  try {
    console.log('Checking account types and existing accounts...');
    
    // Check all account types
    const [accountTypes] = await db.query("SELECT DISTINCT account_type FROM chart_of_accounts ORDER BY account_type");
    console.log('\nAll account types in use:');
    console.table(accountTypes);
    
    // Check all accounts with their types
    const [allAccounts] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts ORDER BY account_type, account_code");
    console.log('\nAll accounts:');
    console.table(allAccounts);
    
    // Check if there are any accounts that could be used for receivables
    const [potentialAR] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_name LIKE '%customer%' OR account_name LIKE '%client%' OR account_name LIKE '%debtor%'");
    console.log('\nPotential accounts receivable accounts:');
    console.table(potentialAR);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAccountTypes(); 