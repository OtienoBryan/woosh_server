const db = require('./database/db');

async function checkInvoices() {
  try {
    console.log('=== CHECKING RECENT INVOICES ===\n');
    
    // Check recent sales orders (invoices)
    console.log('1. Recent Sales Orders (Invoices):');
    const [salesOrders] = await db.query(`
      SELECT 
        so.id,
        so.so_number,
        so.client_id,
        c.name,
        so.order_date,
        so.total_amount,
        so.status,
        so.created_by
      FROM sales_orders so
      LEFT JOIN Clients c ON so.client_id = c.id
      ORDER BY so.id DESC
      LIMIT 10
    `);
    console.table(salesOrders);
    
    // Check customer ledger entries
    console.log('\n2. Recent Customer Ledger Entries:');
    const [customerLedger] = await db.query(`
      SELECT 
        cl.id,
        cl.customer_id,
        c.name,
        cl.date,
        cl.description,
        cl.debit,
        cl.credit,
        cl.running_balance,
        cl.reference_type,
        cl.reference_id
      FROM customer_ledger cl
      LEFT JOIN Clients c ON cl.customer_id = c.id
      ORDER BY cl.id DESC
      LIMIT 10
    `);
    console.table(customerLedger);
    
    // Check account ledger entries
    console.log('\n3. Recent Account Ledger Entries:');
    const [accountLedger] = await db.query(`
      SELECT 
        al.id,
        al.account_id,
        coa.account_name,
        al.date,
        al.description,
        al.debit,
        al.credit,
        al.running_balance,
        al.reference_type,
        al.reference_id
      FROM account_ledger al
      LEFT JOIN chart_of_accounts coa ON al.account_id = coa.id
      ORDER BY al.id DESC
      LIMIT 10
    `);
    console.table(accountLedger);
    
    // Check if accounts receivable balance is showing up
    console.log('\n4. Accounts Receivable Balance:');
    const [arBalance] = await db.query(`
      SELECT 
        coa.account_code,
        coa.account_name,
        COALESCE(SUM(
          CASE 
            WHEN coa.account_type = 2 THEN jel.debit_amount - jel.credit_amount
            ELSE jel.credit_amount - jel.debit_amount
          END
        ), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_code = '1100'
      GROUP BY coa.id, coa.account_code, coa.account_name
    `);
    console.table(arBalance);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInvoices(); 