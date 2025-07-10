const db = require('../database/db');

const receivablesController = {
  // Get aging receivables for all customers
  getAgingReceivables: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          c.id AS customer_id,
          c.company_name,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) <= 0 THEN l.debit - l.credit ELSE 0 END) AS current,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 1 AND 30 THEN l.debit - l.credit ELSE 0 END) AS days_1_30,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 31 AND 60 THEN l.debit - l.credit ELSE 0 END) AS days_31_60,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 61 AND 90 THEN l.debit - l.credit ELSE 0 END) AS days_61_90,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) > 90 THEN l.debit - l.credit ELSE 0 END) AS days_90_plus,
          SUM(l.debit - l.credit) AS total_receivable
        FROM customers c
        LEFT JOIN customer_ledger l ON c.id = l.customer_id
        GROUP BY c.id, c.company_name
        HAVING total_receivable > 0
        ORDER BY c.company_name
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
      const { customer_id, amount, payment_date, payment_method, notes, account_id, reference } = req.body;

      // Insert receipt record
      const [receiptResult] = await connection.query(
        `INSERT INTO receipts (receipt_number, customer_id, receipt_date, payment_method, amount, notes, created_by, account_id, reference, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in pay')`,
        [
          `RCP-${customer_id}-${Date.now()}`,
          customer_id,
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

      // Get last running balance for the account
      const [lastAccountLedger] = await connection.query(
        'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [account_id]
      );
      const prevAccountBalance = lastAccountLedger.length > 0 ? parseFloat(lastAccountLedger[0].running_balance) : 0;
      const newAccountBalance = prevAccountBalance + amount; // Debit increases cash/bank

      // Insert into account_ledger (debit, increases cash/bank)
      await connection.query(
        `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in pay')`,
        [
          account_id,
          payment_date,
          `Customer payment`,
          'receipt',
          receiptId,
          amount,
          0,
          newAccountBalance
        ]
      );

      // Create a journal entry: Debit Cash/Bank, Credit Accounts Receivable
      const [arAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1`
      );
      const [cashAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '1000' LIMIT 1`
      );
      if (arAccount.length && cashAccount.length) {
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-RCP-${customer_id}-${Date.now()}`,
            payment_date,
            `RCP-${receiptId}`,
            `Customer payment`,
            amount,
            amount,
            1
          ]
        );
        const journalEntryId = journalResult.insertId;
        // Debit Cash/Bank
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, cashAccount[0].id, amount, `Customer payment`]
        );
        // Credit Accounts Receivable
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, arAccount[0].id, amount, `Customer payment`]
        );
      }

      await connection.commit();
      res.json({ success: true, message: 'Payment recorded successfully' });
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

      // Update account_ledger status and recalculate running balance
      const [accountLedgerEntry] = await connection.query(
        'SELECT * FROM account_ledger WHERE reference_type = ? AND reference_id = ?',
        ['receipt', receipt_id]
      );
      
      if (accountLedgerEntry.length > 0) {
        const entry = accountLedgerEntry[0];
        
        // Get the previous running balance (before this receipt entry)
        const [previousEntry] = await connection.query(
          'SELECT running_balance FROM account_ledger WHERE account_id = ? AND id < ? ORDER BY id DESC LIMIT 1',
          [entry.account_id, entry.id]
        );
        
        const prevBalance = previousEntry.length > 0 ? parseFloat(previousEntry[0].running_balance) : 0;
        const newBalance = prevBalance + receipt.amount; // Debit increases the account balance
        
        // Update the account ledger entry with confirmed status and correct running balance
        await connection.query(
          `UPDATE account_ledger SET 
           status = 'confirmed', 
           running_balance = ? 
           WHERE reference_type = ? AND reference_id = ?`,
          [newBalance, 'receipt', receipt_id]
        );
      }

      // Insert credit entry into customer_ledger to reduce the receivable balance
      const [lastCustomerLedger] = await connection.query(
        'SELECT running_balance FROM customer_ledger WHERE customer_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [receipt.customer_id]
      );
      const prevCustomerBalance = lastCustomerLedger.length > 0 ? parseFloat(lastCustomerLedger[0].running_balance) : 0;
      const newCustomerBalance = prevCustomerBalance - receipt.amount;

      await connection.query(
        `INSERT INTO customer_ledger (customer_id, date, description, reference_type, reference_id, debit, credit, running_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receipt.customer_id,
          receipt.receipt_date,
          `Payment ${receipt.receipt_number}`,
          'receipt',
          receipt_id,
          0,
          receipt.amount,
          newCustomerBalance
        ]
      );

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
      let query = 'SELECT * FROM receipts';
      const params = [];
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      query += ' ORDER BY receipt_date DESC, id DESC';
      const [rows] = await db.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch receipts' });
    }
  }
};

module.exports = receivablesController; 