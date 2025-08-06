const axios = require('axios');

async function testBalanceSheetAPI() {
  try {
    console.log('=== TESTING BALANCE SHEET API ===\n');
    
    const API_BASE_URL = 'http://localhost:5000/api';
    
    // Test with current date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    const response = await axios.get(`${API_BASE_URL}/financial/reports/balance-sheet?as_of_date=${today}`);
    
    if (response.data.success) {
      const data = response.data.data;
      
      console.log('✅ API Response Success');
      console.log(`As of date: ${data.as_of_date}`);
      console.log(`Total accounts: ${data.metadata.total_accounts}`);
      console.log(`Significant accounts: ${data.metadata.significant_accounts}`);
      
      console.log('\n📊 ASSETS BREAKDOWN:');
      console.log(`Current Assets (${data.assets.current.length} accounts):`);
      data.assets.current.forEach(account => {
        console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
      });
      
      console.log(`\nCurrent Assets Subtotal: ${data.assets.subtotals.current}`);
      console.log(`Non-Current Assets Subtotal: ${data.assets.subtotals.nonCurrent}`);
      console.log(`Total Assets: ${data.totals.total_assets}`);
      
      console.log('\n💰 ACCOUNTS RECEIVABLE DETAILS:');
      const arAccounts = data.assets.current.filter(a => 
        a.account_type === 2 || 
        a.account_name.toLowerCase().includes('receivable') ||
        a.account_code === '1100'
      );
      
      if (arAccounts.length > 0) {
        arAccounts.forEach(account => {
          console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
        });
      } else {
        console.log('  ❌ No accounts receivable found in current assets');
      }
      
      console.log('\n🔍 DRILL DOWN DATA:');
      console.log(`Cash and Equivalents: ${data.drill_down_data.cash_and_equivalents.length} accounts`);
      console.log(`Accounts Receivable: ${data.drill_down_data.accounts_receivable.length} accounts`);
      
      if (data.drill_down_data.accounts_receivable.length > 0) {
        data.drill_down_data.accounts_receivable.forEach(account => {
          console.log(`  - ${account.account_code}: ${account.account_name} = ${account.balance}`);
        });
      }
      
      console.log('\n📈 RATIOS:');
      console.log(`Working Capital: ${data.ratios.working_capital}`);
      console.log(`Current Ratio: ${data.ratios.current_ratio}`);
      
    } else {
      console.log('❌ API Response Error:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ API Call Failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testBalanceSheetAPI(); 