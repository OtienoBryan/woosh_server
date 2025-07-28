const db = require('./database/db');

async function testFixedBalanceSheet() {
  try {
    console.log('=== TESTING FIXED BALANCE SHEET ===\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    // Test the fixed balance sheet query
    const [accountsResult] = await db.query(`
      SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        COALESCE(SUM(
          CASE 
            WHEN coa.account_type = 1 AND coa.account_code = '1500' THEN jel.credit_amount - jel.debit_amount
            WHEN coa.account_type = 1 THEN jel.debit_amount - jel.credit_amount
            WHEN coa.account_type = 2 THEN jel.debit_amount - jel.credit_amount
            WHEN coa.account_type = 13 THEN jel.credit_amount - jel.debit_amount
            ELSE jel.credit_amount - jel.debit_amount
          END
        ), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = true AND (je.entry_date <= ? OR je.entry_date IS NULL)
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
      ORDER BY coa.account_code
    `, [today]);
    
    console.log(`Total accounts found: ${accountsResult.length}`);
    
    // Check accounts receivable specifically
    const arAccounts = accountsResult.filter(a => a.account_type === 2);
    console.log(`\n📊 ACCOUNTS RECEIVABLE (account_type = 2):`);
    console.log(`Found ${arAccounts.length} accounts receivable accounts:`);
    arAccounts.forEach(account => {
      console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
    });
    
    // Check all accounts with balance > 0
    const accountsWithBalance = accountsResult.filter(a => Math.abs(a.balance) > 0);
    console.log(`\n💰 ACCOUNTS WITH BALANCE > 0 (${accountsWithBalance.length} accounts):`);
    accountsWithBalance.forEach(account => {
      console.log(`  - ${account.account_code}: ${account.account_name} (type: ${account.account_type}) = ${account.balance}`);
    });
    
    // Check if account 140 is in the results
    const account140 = accountsResult.find(a => a.id === 140);
    if (account140) {
      console.log(`\n✅ ACCOUNT 140 FOUND:`);
      console.log(`  - ${account140.account_code}: ${account140.account_name} = ${account140.balance}`);
    } else {
      console.log(`\n❌ ACCOUNT 140 NOT FOUND in results`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFixedBalanceSheet(); 