const db = require('./database/db');

async function testFixedTotals() {
  try {
    console.log('=== TESTING FIXED BALANCE SHEET TOTALS ===\n');
    
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
    
    // Filter out income statement accounts (types 14-17)
    const balanceSheetAccounts = accountsResult.filter(a => 
      a.account_type >= 1 && a.account_type <= 13 && a.account_type !== 3 && a.account_type !== 4 && a.account_type !== 5 && a.account_type !== 8 && a.account_type !== 12
    );
    
    console.log(`Total balance sheet accounts: ${balanceSheetAccounts.length}`);
    
    // Calculate totals by category
    const assets = balanceSheetAccounts.filter(a => a.account_type === 1);
    const receivables = balanceSheetAccounts.filter(a => a.account_type === 2);
    const cashAndEquivalents = balanceSheetAccounts.filter(a => a.account_type === 9);
    const stock = balanceSheetAccounts.filter(a => a.account_type === 6);
    const debtorsControl = balanceSheetAccounts.filter(a => a.account_type === 7);
    const liabilities = balanceSheetAccounts.filter(a => a.account_type === 10 || a.account_type === 11);
    const equity = balanceSheetAccounts.filter(a => a.account_type === 13);
    
    const assetTotal = assets.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const receivableTotal = receivables.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const cashTotal = cashAndEquivalents.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const stockTotal = stock.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const debtorsTotal = debtorsControl.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const liabilityTotal = liabilities.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const equityTotal = equity.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    
    console.log('\n📊 BALANCE SHEET TOTALS:');
    console.log(`Assets (type 1): ${assetTotal}`);
    console.log(`Accounts Receivable (type 2): ${receivableTotal}`);
    console.log(`Cash and Equivalents (type 9): ${cashTotal}`);
    console.log(`Stock (type 6): ${stockTotal}`);
    console.log(`Debtors Control (type 7): ${debtorsTotal}`);
    console.log(`Liabilities (type 10, 11): ${liabilityTotal}`);
    console.log(`Equity (type 13): ${equityTotal}`);
    
    const totalAssets = assetTotal + receivableTotal + cashTotal + stockTotal + debtorsTotal;
    const totalLiabilitiesAndEquity = liabilityTotal + equityTotal;
    
    console.log('\n💰 FINAL TOTALS:');
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`Total Liabilities & Equity: ${totalLiabilitiesAndEquity}`);
    console.log(`Difference: ${totalAssets - totalLiabilitiesAndEquity}`);
    
    if (Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01) {
      console.log('✅ BALANCE SHEET IS BALANCED!');
    } else {
      console.log('❌ BALANCE SHEET IS NOT BALANCED');
    }
    
    console.log('\n📋 CURRENT ASSETS BREAKDOWN:');
    const currentAssets = [...receivables, ...cashAndEquivalents, ...stock, ...debtorsControl];
    currentAssets.forEach(account => {
      if (Math.abs(account.balance) > 0) {
        console.log(`  ${account.account_code}: ${account.account_name} = ${account.balance}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFixedTotals(); 