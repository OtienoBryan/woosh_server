const db = require('./database/db');

async function testBalanceSheetData() {
  try {
    console.log('=== TESTING BALANCE SHEET DATA ===\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    // Test the same query as the balance sheet report
    const [accountsResult] = await db.query(`
      SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.parent_account_id,
        COALESCE(SUM(
          CASE 
            WHEN coa.account_type = 1 AND coa.account_code = '1500' THEN jel.credit_amount - jel.debit_amount
            WHEN coa.account_type = 1 THEN jel.debit_amount - jel.credit_amount
            WHEN coa.account_type = 13 THEN jel.credit_amount - jel.debit_amount
            ELSE jel.credit_amount - jel.debit_amount
          END
        ), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.is_active = true AND je.entry_date <= ?
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.parent_account_id
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
    
    // Check cash and equivalents
    const cashAccounts = accountsResult.filter(a => a.account_type === 9);
    console.log(`\n💵 CASH AND EQUIVALENTS (account_type = 9):`);
    console.log(`Found ${cashAccounts.length} cash accounts:`);
    cashAccounts.forEach(account => {
      console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
    });
    
    // Check assets
    const assetAccounts = accountsResult.filter(a => a.account_type === 1);
    console.log(`\n🏢 ASSETS (account_type = 1):`);
    console.log(`Found ${assetAccounts.length} asset accounts:`);
    assetAccounts.forEach(account => {
      console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
    });
    
    // Check recent journal entries for accounts receivable
    console.log(`\n📝 RECENT JOURNAL ENTRIES FOR ACCOUNTS RECEIVABLE:`);
    const [arJournalEntries] = await db.query(`
      SELECT 
        jel.id,
        jel.journal_entry_id,
        jel.account_id,
        coa.account_name,
        jel.debit_amount,
        jel.credit_amount,
        jel.description,
        je.entry_date
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_type = 2
      ORDER BY je.entry_date DESC
      LIMIT 10
    `);
    
    console.log(`Found ${arJournalEntries.length} recent journal entries for accounts receivable:`);
    arJournalEntries.forEach(entry => {
      console.log(`  - ${entry.entry_date}: ${entry.account_name} - Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount} - ${entry.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testBalanceSheetData(); 