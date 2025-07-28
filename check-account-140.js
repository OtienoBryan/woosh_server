const db = require('./database/db');

async function checkAccount140() {
  try {
    console.log('=== CHECKING ACCOUNT ID 140 ===\n');
    
    // Get account details
    console.log('1. Account Details:');
    const [accountDetails] = await db.query(`
      SELECT id, account_code, account_name, account_type, parent_account_id, description, is_active
      FROM chart_of_accounts 
      WHERE id = 140
    `);
    console.table(accountDetails);
    
    // Get account balance
    console.log('\n2. Account Balance:');
    const [accountBalance] = await db.query(`
      SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        COALESCE(SUM(
          CASE 
            WHEN coa.account_type = 2 THEN jel.debit_amount - jel.credit_amount
            ELSE jel.credit_amount - jel.debit_amount
          END
        ), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.id = 140
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
    `);
    console.table(accountBalance);
    
    // Get all journal entries for this account
    console.log('\n3. All Journal Entries for Account 140:');
    const [journalEntries] = await db.query(`
      SELECT 
        jel.id,
        jel.journal_entry_id,
        je.entry_number,
        je.entry_date,
        je.description as je_description,
        jel.debit_amount,
        jel.credit_amount,
        jel.description as jel_description
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = 140
      ORDER BY je.entry_date DESC, jel.id DESC
    `);
    console.table(journalEntries);
    
    // Get running balance calculation
    console.log('\n4. Running Balance Calculation:');
    const [runningBalance] = await db.query(`
      SELECT 
        jel.id,
        je.entry_date,
        jel.debit_amount,
        jel.credit_amount,
        jel.description,
        SUM(jel.debit_amount - jel.credit_amount) OVER (ORDER BY je.entry_date, jel.id) as running_balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE jel.account_id = 140
      ORDER BY je.entry_date, jel.id
    `);
    console.table(runningBalance);
    
    // Check if this account appears in the balance sheet query
    console.log('\n5. Balance Sheet Query Test:');
    const today = new Date().toISOString().split('T')[0];
    const [balanceSheetTest] = await db.query(`
      SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
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
      WHERE coa.id = 140 AND coa.is_active = true AND (je.entry_date <= ? OR je.entry_date IS NULL)
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
    `, [today]);
    console.table(balanceSheetTest);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAccount140(); 