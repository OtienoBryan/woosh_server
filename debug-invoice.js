const db = require('./database/db');

async function debugInvoice() {
  try {
    console.log('=== DEBUGGING INVOICE CREATION ===\n');
    
    // Check what accounts exist
    console.log('1. Checking Sales Revenue account (code 400001):');
    const [salesRevenue] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_code = '400001'");
    console.table(salesRevenue);
    
    console.log('\n2. Checking Accounts Receivable account (code 1100):');
    const [arAccount] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_code = '1100'");
    console.table(arAccount);
    
    console.log('\n3. Checking all accounts with account_type = 2 (receivables):');
    const [arAccounts] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_type = 2");
    console.table(arAccounts);
    
    console.log('\n4. Checking COGS account (code 500000):');
    const [cogsAccount] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_code = '500000'");
    console.table(cogsAccount);
    
    console.log('\n5. Checking Inventory account (code 100001):');
    const [inventoryAccount] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_code = '100001'");
    console.table(inventoryAccount);
    
    console.log('\n6. Checking Sales Tax account (code 210006):');
    const [taxAccount] = await db.query("SELECT id, account_code, account_name, account_type FROM chart_of_accounts WHERE account_code = '210006'");
    console.table(taxAccount);
    
    console.log('\n7. Checking if there are any customers:');
    const [customers] = await db.query("SELECT id, company_name FROM customers LIMIT 5");
    console.table(customers);
    
    console.log('\n8. Checking if there are any products:');
    const [products] = await db.query("SELECT id, product_name, cost_price FROM products LIMIT 5");
    console.table(products);
    
    console.log('\n9. Checking recent journal entries:');
    const [journalEntries] = await db.query("SELECT id, entry_number, entry_date, description, total_debit, total_credit, status FROM journal_entries ORDER BY id DESC LIMIT 5");
    console.table(journalEntries);
    
    console.log('\n10. Checking recent journal entry lines:');
    const [journalLines] = await db.query("SELECT jel.id, jel.journal_entry_id, jel.account_id, jel.debit_amount, jel.credit_amount, jel.description, coa.account_name FROM journal_entry_lines jel LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id ORDER BY jel.id DESC LIMIT 10");
    console.table(journalLines);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugInvoice(); 