const db = require('../database/db');

const payablesController = {
  // Get aging payables for all suppliers
  getAgingPayables: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          s.id AS supplier_id,
          s.company_name,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) <= 0 THEN l.credit - l.debit ELSE 0 END) AS current,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 1 AND 30 THEN l.credit - l.debit ELSE 0 END) AS days_1_30,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 31 AND 60 THEN l.credit - l.debit ELSE 0 END) AS days_31_60,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) BETWEEN 61 AND 90 THEN l.credit - l.debit ELSE 0 END) AS days_61_90,
          SUM(CASE WHEN DATEDIFF(NOW(), l.date) > 90 THEN l.credit - l.debit ELSE 0 END) AS days_90_plus,
          SUM(l.credit - l.debit) AS total_payable
        FROM suppliers s
        LEFT JOIN supplier_ledger l ON s.id = l.supplier_id
        GROUP BY s.id, s.company_name
        HAVING total_payable > 0
        ORDER BY s.company_name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching aging payables:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch aging payables' });
    }
  },

  // Record a payment to a supplier
  makeSupplierPayment: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { supplier_id, amount, payment_date, payment_method, notes, account_id, reference } = req.body;

      // Insert payment record
      const [paymentResult] = await connection.query(
        `INSERT INTO payments (payment_number, supplier_id, payment_date, payment_method, amount, notes, created_by, account_id, reference, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in pay')`,
        [
          `PAY-${supplier_id}-${Date.now()}`,
          supplier_id,
          payment_date,
          payment_method,
          amount,
          notes || '',
          1,
          account_id,
          reference || ''
        ]
      );
      const paymentId = paymentResult.insertId;

      // Get last running balance for the account
      const [lastAccountLedger] = await connection.query(
        'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [account_id]
      );
      const prevAccountBalance = lastAccountLedger.length > 0 ? parseFloat(lastAccountLedger[0].running_balance) : 0;
      const newAccountBalance = prevAccountBalance - amount;

      // Insert into account_ledger (credit, reduces cash/bank) - but don't affect running balance yet
      await connection.query(
        `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in pay')`,
        [
          account_id,
          payment_date,
          `Supplier payment`,
          'payment',
          paymentId,
          0,
          amount,
          prevAccountBalance, // Keep the previous balance until confirmed
          'in pay'
        ]
      );

      // Note: Journal entries will be created only when payment is confirmed

      await connection.commit();
      res.json({ success: true, message: 'Payment recorded successfully', payment_id: paymentId });
    } catch (error) {
      await connection.rollback();
      console.error('Error making supplier payment:', error);
      res.status(500).json({ success: false, error: 'Failed to record payment' });
    } finally {
      connection.release();
    }
  },

  // Confirm a supplier payment (set status to 'confirmed')
  confirmSupplierPayment: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { payment_id } = req.body;

      // Get payment details
      const [paymentResult] = await connection.query(
        'SELECT * FROM payments WHERE id = ?',
        [payment_id]
      );
      
      if (paymentResult.length === 0) {
        throw new Error('Payment not found');
      }
      
      const payment = paymentResult[0];

      // Update payment status
      await connection.query(
        `UPDATE payments SET status = 'confirmed' WHERE id = ?`,
        [payment_id]
      );

      // Update account_ledger status and recalculate running balance
      const [accountLedgerEntry] = await connection.query(
        'SELECT * FROM account_ledger WHERE reference_type = ? AND reference_id = ?',
        ['payment', payment_id]
      );
      
      if (accountLedgerEntry.length > 0) {
        const entry = accountLedgerEntry[0];
        
        // Get the previous running balance (before this payment entry)
        const [previousEntry] = await connection.query(
          'SELECT running_balance FROM account_ledger WHERE account_id = ? AND id < ? ORDER BY id DESC LIMIT 1',
          [entry.account_id, entry.id]
        );
        
        const prevBalance = previousEntry.length > 0 ? parseFloat(previousEntry[0].running_balance) : 0;
        const newBalance = prevBalance - payment.amount; // Credit reduces the account balance
        
        // Update the account ledger entry with confirmed status and correct running balance
        await connection.query(
          `UPDATE account_ledger SET 
           status = 'confirmed', 
           running_balance = ? 
           WHERE reference_type = ? AND reference_id = ?`,
          [newBalance, 'payment', payment_id]
        );

        // Recalculate running balances for all subsequent entries
        const [subsequentEntries] = await connection.query(
          'SELECT * FROM account_ledger WHERE account_id = ? AND id > ? ORDER BY id ASC',
          [entry.account_id, entry.id]
        );

        let currentBalance = newBalance;
        for (const subsequentEntry of subsequentEntries) {
          const debit = parseFloat(subsequentEntry.debit || 0);
          const credit = parseFloat(subsequentEntry.credit || 0);
          currentBalance = currentBalance + debit - credit;
          
          await connection.query(
            'UPDATE account_ledger SET running_balance = ? WHERE id = ?',
            [currentBalance, subsequentEntry.id]
          );
        }
      }

      // Insert debit entry into supplier_ledger to reduce the payable balance
      const [lastSupplierLedger] = await connection.query(
        'SELECT running_balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [payment.supplier_id]
      );
      const prevSupplierBalance = lastSupplierLedger.length > 0 ? parseFloat(lastSupplierLedger[0].running_balance) : 0;
      const newSupplierBalance = prevSupplierBalance - payment.amount;

      const [supplierLedgerResult] = await connection.query(
        `INSERT INTO supplier_ledger (supplier_id, date, description, reference_type, reference_id, debit, credit, running_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payment.supplier_id,
          payment.payment_date,
          `Payment ${payment.payment_number}`,
          'payment',
          payment_id,
          payment.amount,
          0,
          newSupplierBalance
        ]
      );

      // Recalculate running balances for all subsequent supplier ledger entries
      const [subsequentSupplierEntries] = await connection.query(
        'SELECT * FROM supplier_ledger WHERE supplier_id = ? AND id > ? ORDER BY id ASC',
        [payment.supplier_id, supplierLedgerResult.insertId]
      );

      let currentSupplierBalance = newSupplierBalance;
      for (const subsequentEntry of subsequentSupplierEntries) {
        const debit = parseFloat(subsequentEntry.debit || 0);
        const credit = parseFloat(subsequentEntry.credit || 0);
        currentSupplierBalance = currentSupplierBalance + debit - credit;
        
        await connection.query(
          'UPDATE supplier_ledger SET running_balance = ? WHERE id = ?',
          [currentSupplierBalance, subsequentEntry.id]
        );
      }

      // Create a journal entry: Debit Accounts Payable, Credit Cash/Bank
      const [apAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '210000' LIMIT 1`
      );
      const [cashAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '120004' LIMIT 1`
      );
      
      if (apAccount.length && cashAccount.length) {
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-PAY-${payment.supplier_id}-${Date.now()}`,
            payment.payment_date,
            `PAY-${payment_id}`,
            `Supplier payment`,
            payment.amount,
            payment.amount,
            1
          ]
        );
        const journalEntryId = journalResult.insertId;
        
        // Debit Accounts Payable
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, apAccount[0].id, payment.amount, `Supplier payment`]
        );
        
        // Credit Cash/Bank
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, cashAccount[0].id, payment.amount, `Supplier payment`]
        );
      } else {
        console.error('Required accounts not found for journal entry creation');
        console.error('AP Account (210000):', apAccount);
        console.error('Cash Account (120004):', cashAccount);
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

  // Get account ledger for a specific account
  getAccountLedger: async (req, res) => {
    try {
      const { account_id } = req.query;
      if (!account_id) return res.status(400).json({ success: false, error: 'account_id is required' });
      const [rows] = await db.query(
        `SELECT * FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC`,
        [account_id]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching account ledger:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch account ledger' });
    }
  },

  // List payments, optionally filtered by status
  listPayments: async (req, res) => {
    try {
      const { status } = req.query;
      let query = 'SELECT * FROM payments';
      const params = [];
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      query += ' ORDER BY payment_date DESC, id DESC';
      const [rows] = await db.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
  },

  // Create and confirm a supplier payment, with optional allocations to specific purchase orders
  paySupplier: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { supplier_id, payment_date, payment_method, account_id, reference, notes, allocations, amount } = req.body;
      if (!supplier_id || !payment_date || !payment_method || !account_id) {
        return res.status(400).json({ success: false, error: 'supplier_id, payment_date, payment_method, and account_id are required' });
      }

      const creatorUserId = 1; // TODO: replace with auth user id
      const allocs = Array.isArray(allocations) ? allocations.filter(a => a && a.purchase_order_id && Number(a.amount) > 0) : [];
      const totalAmount = allocs.length > 0 ? allocs.reduce((s, a) => s + Number(a.amount || 0), 0) : Number(amount || 0);
      if (totalAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Payment amount must be greater than 0' });
      }

      // Base payment number
      const basePaymentNumber = `PAY-${supplier_id}-${Date.now()}`;
      const createdPaymentIds = [];

      if (allocs.length > 0) {
        // One confirmed payment per allocation, linked to a purchase order for compatibility with existing queries
        for (let i = 0; i < allocs.length; i += 1) {
          const { purchase_order_id, amount: allocAmount } = allocs[i];
          const paymentNumber = `${basePaymentNumber}-${i + 1}`;
          const [result] = await connection.query(
            `INSERT INTO payments (payment_number, supplier_id, payment_date, payment_method, amount, notes, created_by, account_id, reference, status, purchase_order_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
            [paymentNumber, supplier_id, payment_date, payment_method, allocAmount, notes || '', creatorUserId, account_id, reference || '', purchase_order_id]
          );
          const paymentId = result.insertId;
          createdPaymentIds.push(paymentId);

          // Supplier ledger debit for this allocation
          // Get last running balance
          const [lastSupplierLedger] = await connection.query(
            'SELECT running_balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC, id DESC LIMIT 1',
            [supplier_id]
          );
          const prevSupplierBalance = lastSupplierLedger.length > 0 ? parseFloat(lastSupplierLedger[0].running_balance) : 0;
          const newSupplierBalance = prevSupplierBalance - Number(allocAmount);

          // Fetch PO number for description
          const [poRows] = await connection.query('SELECT po_number FROM purchase_orders WHERE id = ? LIMIT 1', [purchase_order_id]);
          const poNumber = poRows.length ? poRows[0].po_number : purchase_order_id;

          await connection.query(
            `INSERT INTO supplier_ledger (supplier_id, date, description, reference_type, reference_id, debit, credit, running_balance)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              supplier_id,
              payment_date,
              `Payment ${paymentNumber} for PO ${poNumber}`,
              'payment',
              paymentId,
              Number(allocAmount),
              0,
              newSupplierBalance
            ]
          );
        }
      } else {
        // Single confirmed payment without allocations
        const [result] = await connection.query(
          `INSERT INTO payments (payment_number, supplier_id, payment_date, payment_method, amount, notes, created_by, account_id, reference, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
          [basePaymentNumber, supplier_id, payment_date, payment_method, totalAmount, notes || '', creatorUserId, account_id, reference || '']
        );
        const paymentId = result.insertId;
        createdPaymentIds.push(paymentId);

        // Supplier ledger debit (reduces payable)
        const [lastSupplierLedger] = await connection.query(
          'SELECT running_balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC, id DESC LIMIT 1',
          [supplier_id]
        );
        const prevSupplierBalance = lastSupplierLedger.length > 0 ? parseFloat(lastSupplierLedger[0].running_balance) : 0;
        const newSupplierBalance = prevSupplierBalance - totalAmount;
        await connection.query(
          `INSERT INTO supplier_ledger (supplier_id, date, description, reference_type, reference_id, debit, credit, running_balance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [supplier_id, payment_date, `Payment ${basePaymentNumber}`, 'payment', paymentId, totalAmount, 0, newSupplierBalance]
        );
      }

      // Account ledger: single confirmed credit reducing cash/bank for the total
      // Get previous balance
      const [prevAccRow] = await connection.query(
        'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [account_id]
      );
      const prevAccountBalance = prevAccRow.length > 0 ? parseFloat(prevAccRow[0].running_balance) : 0;
      const newAccountBalance = prevAccountBalance - totalAmount;
      const [accountLedgerResult] = await connection.query(
        `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
        [account_id, payment_date, 'Supplier payment', 'payment', createdPaymentIds[0], 0, totalAmount, newAccountBalance]
      );

      // Recalculate running balances for all subsequent account ledger entries
      const [subsequentAccountEntries] = await connection.query(
        'SELECT * FROM account_ledger WHERE account_id = ? AND id > ? ORDER BY id ASC',
        [account_id, accountLedgerResult.insertId]
      );
      let currentAccountBalance = newAccountBalance;
      for (const subsequentEntry of subsequentAccountEntries) {
        const debit = parseFloat(subsequentEntry.debit || 0);
        const credit = parseFloat(subsequentEntry.credit || 0);
        currentAccountBalance = currentAccountBalance + debit - credit;
        await connection.query(
          'UPDATE account_ledger SET running_balance = ? WHERE id = ? ',
          [currentAccountBalance, subsequentEntry.id]
        );
      }

      // Journal entries: Debit Accounts Payable, Credit Cash/Bank
      const [apAccount] = await connection.query(`SELECT id FROM chart_of_accounts WHERE account_code = '210000' LIMIT 1`);
      const [cashAccount] = await connection.query(`SELECT id FROM chart_of_accounts WHERE account_code = '120004' LIMIT 1`);
      if (apAccount.length && cashAccount.length) {
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-PAY-${supplier_id}-${Date.now()}`,
            payment_date,
            basePaymentNumber,
            'Supplier payment',
            totalAmount,
            totalAmount,
            creatorUserId
          ]
        );
        const journalEntryId = journalResult.insertId;
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, apAccount[0].id, totalAmount, 'Supplier payment']
        );
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, cashAccount[0].id, totalAmount, 'Supplier payment']
        );
      }

      await connection.commit();
      res.json({ success: true, message: 'Payment recorded and confirmed', payment_numbers: createdPaymentIds.length, total_amount: totalAmount });
    } catch (error) {
      await connection.rollback();
      console.error('Error paying supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to record payment' });
    } finally {
      connection.release();
    }
  },

  // List all accounts
  listAccounts: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM chart_of_accounts WHERE is_active = true ORDER BY account_code');
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
  },

  // Get supplier ledger entries and supplier details
  getSupplierLedger: async (req, res) => {
    try {
      const { id } = req.params;
      const { start_date, end_date, q, page: pageStr, limit: limitStr } = req.query;
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(limitStr, 10) || 25));
      const offset = (page - 1) * limit;
      // Supplier details
      const [suppliers] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
      if (suppliers.length === 0) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      const supplier = suppliers[0];

      // Ledger entries with optional filters
      let baseWhere = 'WHERE supplier_id = ?';
      const params = [id];
      if (start_date && end_date) {
        baseWhere += ' AND date BETWEEN ? AND ?';
        params.push(start_date, end_date);
      } else if (start_date) {
        baseWhere += ' AND date >= ?';
        params.push(start_date);
      } else if (end_date) {
        baseWhere += ' AND date <= ?';
        params.push(end_date);
      }
      if (q && String(q).trim() !== '') {
        baseWhere += ' AND (description LIKE ? OR reference_type LIKE ? OR reference_id LIKE ?)';
        const like = `%${q}%`;
        params.push(like, like, like);
      }
      // Count total for pagination
      const [countRows] = await db.query(`SELECT COUNT(*) as cnt FROM supplier_ledger ${baseWhere}`, params);
      const total = countRows[0]?.cnt || 0;

      // Fetch paginated entries
      const [entries] = await db.query(
        `SELECT id, supplier_id, date, description, reference_type, reference_id, debit, credit, running_balance, created_at
         FROM supplier_ledger ${baseWhere} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      // Summary
      // Summary over the full filtered set (not just current page)
      const [sumRows] = await db.query(
        `SELECT COALESCE(SUM(debit),0) as total_debit, COALESCE(SUM(credit),0) as total_credit
         FROM supplier_ledger ${baseWhere}`,
        params
      );
      const totalDebit = Number(sumRows[0]?.total_debit || 0);
      const totalCredit = Number(sumRows[0]?.total_credit || 0);
      // Latest running balance in filtered set
      const [lastRows] = await db.query(
        `SELECT running_balance FROM supplier_ledger ${baseWhere} ORDER BY date DESC, id DESC LIMIT 1`,
        params
      );
      const currentBalance = lastRows.length ? Number(lastRows[0].running_balance || 0) : (totalCredit - totalDebit);

      // Aging buckets (optional: respect date filters, ignore text search)
      let agingWhere = 'WHERE supplier_id = ?';
      const agingParams = [id];
      if (start_date && end_date) {
        agingWhere += ' AND date BETWEEN ? AND ?';
        agingParams.push(start_date, end_date);
      } else if (start_date) {
        agingWhere += ' AND date >= ?';
        agingParams.push(start_date);
      } else if (end_date) {
        agingWhere += ' AND date <= ?';
        agingParams.push(end_date);
      }
      const [agingRows] = await db.query(
        `SELECT
           COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), date) <= 0 THEN credit - debit ELSE 0 END), 0) AS current,
           COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), date) BETWEEN 1 AND 30 THEN credit - debit ELSE 0 END), 0) AS days_1_30,
           COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), date) BETWEEN 31 AND 60 THEN credit - debit ELSE 0 END), 0) AS days_31_60,
           COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), date) BETWEEN 61 AND 90 THEN credit - debit ELSE 0 END), 0) AS days_61_90,
           COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), date) > 90 THEN credit - debit ELSE 0 END), 0) AS days_90_plus,
           COALESCE(SUM(credit - debit), 0) AS total_payable
         FROM supplier_ledger ${agingWhere}`,
        agingParams
      );
      const aging = agingRows && agingRows.length ? agingRows[0] : {
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_90_plus: 0,
        total_payable: 0,
      };

      res.json({
        success: true,
        data: {
          supplier,
          entries,
          summary: {
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: currentBalance,
          },
          aging,
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.max(1, Math.ceil(total / limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching supplier ledger:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch supplier ledger' });
    }
  }
};

module.exports = payablesController; 