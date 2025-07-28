const db = require('./database/db');

async function fixBalanceSheetTotals() {
  try {
    console.log('=== FIXING BALANCE SHEET TOTALS ===\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    // Get all accounts with balances
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
    
    console.log('📊 ALL ACCOUNTS WITH BALANCES:');
    accountsResult.forEach(account => {
      if (Math.abs(account.balance) > 0) {
        console.log(`  ${account.account_code}: ${account.account_name} (type: ${account.account_type}) = ${account.balance}`);
      }
    });
    
    // Check for accounts that should be assets but aren't type 1
    console.log('\n🔍 ACCOUNTS THAT MIGHT BE MISCLASSIFIED:');
    const potentialAssets = accountsResult.filter(a => 
      (a.account_name.toLowerCase().includes('stock') || 
       a.account_name.toLowerCase().includes('inventory') ||
       a.account_name.toLowerCase().includes('equipment') ||
       a.account_name.toLowerCase().includes('vehicle') ||
       a.account_name.toLowerCase().includes('building') ||
       a.account_name.toLowerCase().includes('asset')) &&
      a.account_type !== 1 && Math.abs(a.balance) > 0
    );
    
    potentialAssets.forEach(account => {
      console.log(`  ${account.account_code}: ${account.account_name} (type: ${account.account_type}) = ${account.balance} - Should be asset?`);
    });
    
    // Check for accounts that should be liabilities but aren't type 10 or 11
    const potentialLiabilities = accountsResult.filter(a => 
      (a.account_name.toLowerCase().includes('payable') || 
       a.account_name.toLowerCase().includes('debt') ||
       a.account_name.toLowerCase().includes('loan') ||
       a.account_name.toLowerCase().includes('credit')) &&
      a.account_type !== 10 && a.account_type !== 11 && Math.abs(a.balance) > 0
    );
    
    if (potentialLiabilities.length > 0) {
      console.log('\n💳 ACCOUNTS THAT MIGHT BE LIABILITIES:');
      potentialLiabilities.forEach(account => {
        console.log(`  ${account.account_code}: ${account.account_name} (type: ${account.account_type}) = ${account.balance} - Should be liability?`);
      });
    }
    
    // Check for accounts that should be equity but aren't type 13
    const potentialEquity = accountsResult.filter(a => 
      (a.account_name.toLowerCase().includes('capital') || 
       a.account_name.toLowerCase().includes('equity') ||
       a.account_name.toLowerCase().includes('retained') ||
       a.account_name.toLowerCase().includes('reserve')) &&
      a.account_type !== 13 && Math.abs(a.balance) > 0
    );
    
    if (potentialEquity.length > 0) {
      console.log('\n💰 ACCOUNTS THAT MIGHT BE EQUITY:');
      potentialEquity.forEach(account => {
        console.log(`  ${account.account_code}: ${account.account_name} (type: ${account.account_type}) = ${account.balance} - Should be equity?`);
      });
    }
    
    // Calculate corrected totals
    console.log('\n💰 CORRECTED TOTALS CALCULATION:');
    
    // Assets: type 1 + type 6 (stock/inventory) + type 7 (debtors control)
    const assets = accountsResult.filter(a => a.account_type === 1);
    const stock = accountsResult.filter(a => a.account_type === 6);
    const debtorsControl = accountsResult.filter(a => a.account_type === 7);
    const receivables = accountsResult.filter(a => a.account_type === 2);
    const cashAndEquivalents = accountsResult.filter(a => a.account_type === 9);
    const liabilities = accountsResult.filter(a => a.account_type === 10 || a.account_type === 11);
    const equity = accountsResult.filter(a => a.account_type === 13);
    
    const assetTotal = assets.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const stockTotal = stock.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const debtorsTotal = debtorsControl.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const receivableTotal = receivables.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const cashTotal = cashAndEquivalents.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const liabilityTotal = liabilities.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    const equityTotal = equity.reduce((sum, a) => sum + (typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0), 0);
    
    console.log(`Assets (type 1): ${assetTotal}`);
    console.log(`Stock (type 6): ${stockTotal}`);
    console.log(`Debtors Control (type 7): ${debtorsTotal}`);
    console.log(`Accounts Receivable (type 2): ${receivableTotal}`);
    console.log(`Cash and Equivalents (type 9): ${cashTotal}`);
    console.log(`Liabilities (type 10, 11): ${liabilityTotal}`);
    console.log(`Equity (type 13): ${equityTotal}`);
    
    const totalAssets = assetTotal + stockTotal + debtorsTotal + receivableTotal + cashTotal;
    const totalLiabilitiesAndEquity = liabilityTotal + equityTotal;
    
    console.log('\n💰 CORRECTED TOTALS:');
    console.log(`Total Assets: ${totalAssets}`);
    console.log(`Total Liabilities & Equity: ${totalLiabilitiesAndEquity}`);
    console.log(`Difference: ${totalAssets - totalLiabilitiesAndEquity}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixBalanceSheetTotals(); 