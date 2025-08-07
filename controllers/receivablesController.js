const db = require('../database/db');

const receivablesController = {
  // Get aging receivables for all customers
  getAgingReceivables: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          c.id AS customer_id,
          c.name AS client_name,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) <= 0 THEN l.debit - l.credit ELSE 0 END) AS current,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 1 AND 30 THEN l.debit - l.credit ELSE 0 END) AS days_1_30,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 31 AND 60 THEN l.debit - l.credit ELSE 0 END) AS days_31_60,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 61 AND 90 THEN l.debit - l.credit ELSE 0 END) AS days_61_90,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) > 90 THEN l.debit - l.credit ELSE 0 END) AS days_90_plus,
          SUM(l.debit - l.credit) AS total_receivable
        FROM Clients c
        LEFT JOIN client_ledger l ON c.id = l.client_id
        GROUP BY c.id, c.name
        HAVING total_receivable > 0
        ORDER BY c.name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching aging receivables:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch aging receivables' });
    }
  },

  // Record a payment from a customer
  makeCustomerPayment: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { customer_id, amount, payment_date, payment_method, notes, account_id, reference, invoice_id } = req.body;

      // Get invoice number if invoice_id is provided
      let invoiceNumber = null;
      if (invoice_id) {
        const [invoiceResult] = await connection.query(
          'SELECT so_number FROM sales_orders WHERE id = ?',
          [invoice_id]
        );
        if (invoiceResult.length > 0) {
          // Extract numeric part from so_number (e.g., "INV-123-456" -> 123)
          const soNumber = invoiceResult[0].so_number;
          const numericMatch = soNumber.match(/\d+/);
          invoiceNumber = numericMatch ? parseInt(numericMatch[0]) : null;
        }
      }

      // Insert receipt record
      const [receiptResult] = await connection.query(
        `INSERT INTO receipts (receipt_number, client_id, invoice_number, receipt_date, payment_method, amount, notes, created_by, account_id, reference, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in pay')`,
        [
          `RCP-${customer_id}-${Date.now()}`,
          customer_id,
          invoiceNumber,
          payment_date,
          payment_method,
          amount,
          notes || '',
          1,
          account_id,
          reference || ''
        ]
      );
      const receiptId = receiptResult.insertId;

      // Note: Account ledger entries and journal entries will be created only when payment is confirmed

      // If this payment is for a specific invoice, update the invoice status
      if (invoice_id) {
        console.log('Updating invoice status to "in payment" for invoice ID:', invoice_id);
        await connection.query(
          `UPDATE sales_orders SET status = 'in payment' WHERE id = ?`,
          [invoice_id]
        );
        
        // Verify the update
        const [updatedInvoice] = await connection.query(
          'SELECT status FROM sales_orders WHERE id = ?',
          [invoice_id]
        );
        console.log('Invoice status after update:', updatedInvoice[0]?.status);
      }

      await connection.commit();
      res.json({ success: true, message: 'Payment recorded successfully', receipt_id: receiptId });
    } catch (error) {
      await connection.rollback();
      console.error('Error making customer payment:', error);
      res.status(500).json({ success: false, error: 'Failed to record payment' });
    } finally {
      connection.release();
    }
  },

  // Confirm a customer payment (set status to 'confirmed')
  confirmCustomerPayment: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { receipt_id } = req.body;

      // Get receipt details
      const [receiptResult] = await connection.query(
        'SELECT * FROM receipts WHERE id = ?',
        [receipt_id]
      );
      
      if (receiptResult.length === 0) {
        throw new Error('Receipt not found');
      }
      
      const receipt = receiptResult[0];

      // Update receipt status
      await connection.query(
        `UPDATE receipts SET status = 'confirmed' WHERE id = ?`,
        [receipt_id]
      );

      // Create account ledger entry for the confirmed payment
      const [lastAccountLedger] = await connection.query(
        'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [receipt.account_id]
      );
      const prevAccountBalance = lastAccountLedger.length > 0 ? parseFloat(lastAccountLedger[0].running_balance) : 0;
      const newAccountBalance = prevAccountBalance + receipt.amount; // Debit increases cash/bank

      // Insert into account_ledger (debit, increases cash/bank)
      const [accountLedgerResult] = await connection.query(
        `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
        [
          receipt.account_id,
          receipt.receipt_date,
          `Customer payment ${receipt.receipt_number}`,
          'receipt',
          receipt_id,
          receipt.amount,
          0,
          newAccountBalance,
          'confirmed'
        ]
      );

      // Recalculate running balances for all subsequent account ledger entries
      const [subsequentAccountEntries] = await connection.query(
        'SELECT * FROM account_ledger WHERE account_id = ? AND id > ? ORDER BY id ASC',
        [receipt.account_id, accountLedgerResult.insertId]
      );

      let currentAccountBalance = newAccountBalance;
      for (const subsequentEntry of subsequentAccountEntries) {
        const debit = parseFloat(subsequentEntry.debit || 0);
        const credit = parseFloat(subsequentEntry.credit || 0);
        currentAccountBalance = currentAccountBalance + debit - credit;
        
        await connection.query(
          'UPDATE account_ledger SET running_balance = ? WHERE id = ?',
          [currentAccountBalance, subsequentEntry.id]
        );
      }

      // Insert credit entry into client_ledger to reduce the receivable balance
      const [lastCustomerLedger] = await connection.query(
        'SELECT running_balance FROM client_ledger WHERE client_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [receipt.client_id]
      );
      const prevCustomerBalance = lastCustomerLedger.length > 0 ? parseFloat(lastCustomerLedger[0].running_balance) : 0;
      const newCustomerBalance = prevCustomerBalance - receipt.amount;

      const [customerLedgerResult] = await connection.query(
        `INSERT INTO client_ledger (client_id, date, description, reference_type, reference_id, debit, credit, running_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receipt.client_id,
          receipt.receipt_date,
          `Payment ${receipt.receipt_number}`,
          'receipt',
          receipt_id,
          0,
          receipt.amount,
          newCustomerBalance
        ]
      );

      // Recalculate running balances for all subsequent customer ledger entries
      const [subsequentCustomerEntries] = await connection.query(
        'SELECT * FROM client_ledger WHERE client_id = ? AND id > ? ORDER BY id ASC',
        [receipt.client_id, customerLedgerResult.insertId]
      );

      let currentCustomerBalance = newCustomerBalance;
      for (const subsequentEntry of subsequentCustomerEntries) {
        const debit = parseFloat(subsequentEntry.debit || 0);
        const credit = parseFloat(subsequentEntry.credit || 0);
        currentCustomerBalance = currentCustomerBalance + debit - credit;
        
        await connection.query(
          'UPDATE client_ledger SET running_balance = ? WHERE id = ?',
          [currentCustomerBalance, subsequentEntry.id]
        );
      }

      // Update the Clients table balance column with the final calculated balance
      try {
        await connection.query(
          'UPDATE Clients SET balance = ? WHERE id = ?',
          [currentCustomerBalance, receipt.client_id]
        );
        console.log('Clients table balance updated successfully for payment confirmation');
      } catch (balanceError) {
        console.warn('Failed to update Clients table balance:', balanceError.message);
        // Continue with the transaction even if balance update fails
      }

      // Create a journal entry: Debit Cash/Bank, Credit Accounts Receivable
      // First try to find accounts receivable by code 1100
      let [arAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1`
      );
      
      // If not found, try to find any accounts receivable account
      if (!arAccount.length) {
        [arAccount] = await connection.query(
          `SELECT id FROM chart_of_accounts WHERE account_name LIKE '%receivable%' OR account_name LIKE '%AR%' LIMIT 1`
        );
      }
      
      if (!arAccount.length) {
        console.error('Accounts Receivable account not found in chart of accounts');
        throw new Error('Accounts Receivable account not configured. Please ensure an accounts receivable account exists.');
      }
      
      const [journalResult] = await connection.query(
        `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
        [
          `JE-RCP-${receipt.client_id}-${Date.now()}`,
          receipt.receipt_date,
          `RCP-${receipt_id}`,
          `Customer payment - ${receipt.payment_method}`,
          receipt.amount,
          receipt.amount,
          1
        ]
      );
      const journalEntryId = journalResult.insertId;
      console.log('Journal entry created with ID:', journalEntryId);
      
      // Debit the selected cash/bank account (from the form)
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, ?, 0, ?)`,
        [journalEntryId, receipt.account_id, receipt.amount, `Customer payment received`]
      );
      console.log('Debit line created for account:', receipt.account_id, 'amount:', receipt.amount);
      
      // Credit Accounts Receivable
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, 0, ?, ?)`,
        [journalEntryId, arAccount[0].id, receipt.amount, `Customer payment received`]
      );
      console.log('Credit line created for AR account:', arAccount[0].id, 'amount:', receipt.amount);

      // If this receipt is linked to an invoice, update the invoice status to 'paid'
      const [invoiceResult] = await connection.query(
        'SELECT id FROM sales_orders WHERE id IN (SELECT reference_id FROM client_ledger WHERE reference_type = ? AND reference_id = ?)',
        ['receipt', receipt_id]
      );
      
      if (invoiceResult.length > 0) {
        await connection.query(
          `UPDATE sales_orders SET status = 'paid' WHERE id = ?`,
          [invoiceResult[0].id]
        );
      }

      await connection.commit();
      res.json({ success: true, message: 'Payment confirmed.' });
    } catch (error) {
      await connection.rollback();
      console.error('Error confirming payment:', error);
      res.status(500).json({ success: false, error: 'Failed to confirm payment' });
    } finally {
      connection.release();
    }
  },

  // List receipts, optionally filtered by status
  listReceipts: async (req, res) => {
    try {
      const { status } = req.query;
      let query = `SELECT r.*, c.name FROM receipts r LEFT JOIN Clients c ON r.client_id = c.id`;
      const params = [];
      if (status) {
        query += ' WHERE r.status = ?';
        params.push(status);
      }
      query += ' ORDER BY r.receipt_date DESC, r.id DESC';
      const [rows] = await db.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch receipts' });
    }
  },

  // Get pending receipts for a specific invoice
  getPendingReceiptsForInvoice: async (req, res) => {
    try {
      const { invoice_id } = req.params;
      
      // First get the invoice details to find the customer
      const [invoiceResult] = await db.query(
        'SELECT client_id FROM sales_orders WHERE id = ?',
        [invoice_id]
      );
      
      if (invoiceResult.length === 0) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      const customerId = invoiceResult[0].client_id;
      
      // Get pending receipts for this customer created in the last 24 hours
      const [receipts] = await db.query(
        `SELECT * FROM receipts 
         WHERE client_id = ? 
         AND status = 'in pay' 
         AND receipt_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         ORDER BY receipt_date DESC, id DESC`,
        [customerId]
      );
      
      res.json({ success: true, data: receipts });
    } catch (error) {
      console.error('Error fetching pending receipts for invoice:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pending receipts' });
    }
  }
};

module.exports = receivablesController; 