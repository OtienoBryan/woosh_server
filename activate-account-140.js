const db = require('./database/db');

async function activateAccount140() {
  try {
    console.log('=== ACTIVATING ACCOUNT 140 ===\n');
    
    // Check current status
    console.log('1. Current account status:');
    const [currentStatus] = await db.query(`
      SELECT id, account_code, account_name, account_type, is_active
      FROM chart_of_accounts 
      WHERE id = 140
    `);
    console.table(currentStatus);
    
    // Activate the account
    console.log('\n2. Activating account...');
    const [updateResult] = await db.query(`
      UPDATE chart_of_accounts 
      SET is_active = 1 
      WHERE id = 140
    `);
    
    console.log(`Rows affected: ${updateResult.affectedRows}`);
    
    // Check new status
    console.log('\n3. New account status:');
    const [newStatus] = await db.query(`
      SELECT id, account_code, account_name, account_type, is_active
      FROM chart_of_accounts 
      WHERE id = 140
    `);
    console.table(newStatus);
    
    // Test balance sheet query again
    console.log('\n4. Testing balance sheet query with active account:');
    const today = new Date().toISOString().split('T')[0];
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
    
    const account140 = accountsResult.find(a => a.id === 140);
    if (account140) {
      console.log(`✅ ACCOUNT 140 NOW FOUND:`);
      console.log(`  - ${account140.account_code}: ${account140.account_name} = ${account140.balance}`);
    } else {
      console.log(`❌ ACCOUNT 140 STILL NOT FOUND`);
    }
    
    // Check all accounts receivable
    const arAccounts = accountsResult.filter(a => a.account_type === 2);
    console.log(`\n📊 ACCOUNTS RECEIVABLE (account_type = 2):`);
    console.log(`Found ${arAccounts.length} accounts receivable accounts:`);
    arAccounts.forEach(account => {
      console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

activateAccount140(); 