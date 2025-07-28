const db = require('./database/db');

async function checkCurrentTotals() {
  try {
    console.log('=== CHECKING CURRENT BALANCE SHEET TOTALS ===\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    // Get all account balances
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
    
    // Calculate totals by category
    const assets = accountsResult.filter(a => a.account_type === 1);
    const receivables = accountsResult.filter(a => a.account_type === 2);
    const cashAndEquivalents = accountsResult.filter(a => a.account_type === 9);
    const liabilities = accountsResult.filter(a => a.account_type === 10 || a.account_type === 11);
    const equity = accountsResult.filter(a => a.account_type === 13);
    
    const assetTotal = assets.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const receivableTotal = receivables.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const cashTotal = cashAndEquivalents.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const liabilityTotal = liabilities.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const equityTotal = equity.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    
    console.log('📊 CURRENT TOTALS:');
    console.log(`Assets (type 1): ${assetTotal}`);
    console.log(`Accounts Receivable (type 2): ${receivableTotal}`);
    console.log(`Cash and Equivalents (type 9): ${cashTotal}`);
    console.log(`Liabilities (type 10, 11): ${liabilityTotal}`);
    console.log(`Equity (type 13): ${equityTotal}`);
    
    const totalAssets = assetTotal + receivableTotal + cashTotal;
    const totalLiabilitiesAndEquity = liabilityTotal + equityTotal;
    
    console.log('\n💰 CALCULATED TOTALS:');
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`Total Liabilities & Equity: ${totalLiabilitiesAndEquity}`);
    console.log(`Difference: ${totalAssets - totalLiabilitiesAndEquity}`);
    
    console.log('\n📋 DETAILED BREAKDOWN:');
    console.log('\nAssets:');
    assets.forEach(a => console.log(`  ${a.account_code}: ${a.account_name} = ${a.balance}`));
    
    console.log('\nAccounts Receivable:');
    receivables.forEach(a => console.log(`  ${a.account_code}: ${a.account_name} = ${a.balance}`));
    
    console.log('\nCash and Equivalents:');
    cashAndEquivalents.forEach(a => console.log(`  ${a.account_code}: ${a.account_name} = ${a.balance}`));
    
    console.log('\nLiabilities:');
    liabilities.forEach(a => console.log(`  ${a.account_code}: ${a.account_name} = ${a.balance}`));
    
    console.log('\nEquity:');
    equity.forEach(a => console.log(`  ${a.account_code}: ${a.account_name} = ${a.balance}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCurrentTotals(); 