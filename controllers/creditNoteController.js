const db = require('../database/db');

const creditNoteController = {
  // Get all credit notes
  getAllCreditNotes: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          cn.*,
          c.name as customer_name,
          c.email,
          c.contact,
          c.address
        FROM credit_notes cn
        LEFT JOIN Clients c ON cn.client_id = c.id
        ORDER BY cn.created_at DESC
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching credit notes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch credit notes' });
    }
  },

  // Get credit note by ID
  getCreditNoteById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(`
        SELECT 
          cn.*,
          c.name as customer_name,
          c.email,
          c.contact,
          c.address
        FROM credit_notes cn
        LEFT JOIN Clients c ON cn.client_id = c.id
        WHERE cn.id = ?
      `, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Credit note not found' });
      }

             // Get credit note items
       const [items] = await db.query(`
         SELECT 
           cni.*,
           p.product_name,
           p.product_code,
           so.so_number as invoice_number
         FROM credit_note_items cni
         LEFT JOIN products p ON cni.product_id = p.id
         LEFT JOIN sales_orders so ON cni.invoice_id = so.id
         WHERE cni.credit_note_id = ?
       `, [id]);

      const creditNote = rows[0];
      creditNote.items = items;
      
      res.json({ success: true, data: creditNote });
    } catch (error) {
      console.error('Error fetching credit note:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch credit note' });
    }
  },

  // Get customer invoices for credit note creation
  getCustomerInvoices: async (req, res) => {
    try {
      const { customerId } = req.params;
      
      // Get all confirmed invoices for the customer that haven't been fully credited
      const [rows] = await db.query(`
        SELECT 
          so.id,
          so.so_number as invoice_number,
          so.order_date as invoice_date,
          so.expected_delivery_date as due_date,
          so.subtotal,
          so.tax_amount,
          so.total_amount,
          so.notes,
          COALESCE(SUM(cn.total_amount), 0) as credited_amount,
          (so.total_amount - COALESCE(SUM(cn.total_amount), 0)) as remaining_amount
        FROM sales_orders so
        LEFT JOIN credit_notes cn ON so.id = cn.original_invoice_id
        WHERE so.client_id = ? 
          AND so.status = 'confirmed'
        GROUP BY so.id, so.so_number, so.order_date, so.expected_delivery_date, so.subtotal, so.tax_amount, so.total_amount, so.notes
        HAVING remaining_amount > 0
        ORDER BY so.order_date DESC
      `, [customerId]);

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customer invoices' });
    }
  },

  // Create a new credit note
  createCreditNote: async (req, res) => {
    let connection;
    try {
      connection = await db.getConnection();
      console.log('Database connection acquired for credit note creation');
      
      await connection.beginTransaction();
      console.log('Transaction started for credit note creation');
      
      const { 
       customer_id, 
        credit_note_date, 
        reason, 
        original_invoice_id,
        items 
      } = req.body;

      // Generate credit note number
      const creditNoteNumber = `CN-${customer_id}-${Date.now()}`;

      // Calculate totals
      const TAX_RATE = 0.16;
      const TAX_DIVISOR = 1 + TAX_RATE;
      let subtotal = 0;
      let tax_amount = 0;
      let total_amount = 0;

      for (const item of items) {
        const itemTotal = item.quantity * item.unit_price;
        const itemNet = itemTotal / TAX_DIVISOR;
        const itemTax = itemTotal - itemNet;
        subtotal += itemNet;
        tax_amount += itemTax;
        total_amount += itemTotal;
      }

      // Insert credit note
      const [creditNoteResult] = await connection.query(
        `INSERT INTO credit_notes (
          credit_note_number, 
          client_id, 
          credit_note_date, 
          original_invoice_id,
          reason, 
          subtotal, 
          tax_amount, 
          total_amount, 
          status,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [
          creditNoteNumber,
          customer_id,
          credit_note_date,
          original_invoice_id,
          reason || '',
          subtotal,
          tax_amount,
          total_amount,
          1 // created_by
        ]
      );
      const creditNoteId = creditNoteResult.insertId;

             // Insert credit note items
       for (const item of items) {
         const itemTotal = item.quantity * item.unit_price;
         const itemNet = itemTotal / TAX_DIVISOR;
         const itemTax = itemTotal - itemNet;
         
         await connection.query(
           `INSERT INTO credit_note_items (
             credit_note_id, 
             invoice_id,
             product_id, 
             quantity, 
             unit_price, 
             total_price, 
             net_price, 
             tax_amount
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
           [
             creditNoteId,
             original_invoice_id || item.invoice_id,
             item.product_id,
             item.quantity,
             item.unit_price,
             itemTotal,
             itemNet,
             itemTax
           ]
         );
       }

      // Update customer ledger (credit, decreases receivable)
      const [lastCustomerLedger] = await connection.query(
        'SELECT running_balance FROM client_ledger WHERE client_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [customer_id]
      );
      const prevBalance = lastCustomerLedger.length > 0 ? parseFloat(lastCustomerLedger[0].running_balance) : 0;
      const newBalance = prevBalance - total_amount; // Credit note reduces receivable

      await connection.query(
        `INSERT INTO client_ledger (
          client_id, 
          date, 
          description, 
          reference_type, 
          reference_id, 
          debit, 
          credit, 
          running_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          credit_note_date,
          `Credit Note ${creditNoteNumber}`,
          'credit_note',
          creditNoteId,
          0,
          total_amount,
          newBalance
        ]
      );

      // Update the Clients table balance column
      try {
        await connection.query(
          'UPDATE Clients SET balance = ? WHERE id = ?',
          [newBalance, customer_id]
        );
        console.log('Clients table balance updated successfully for credit note creation');
      } catch (balanceError) {
        console.warn('Failed to update Clients table balance:', balanceError.message);
      }

      // Create journal entries for credit note
      const [salesRevenueAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '400001' LIMIT 1`
      );
      const [accountsReceivableAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_type = 2 LIMIT 1`
      );
      const [salesTaxAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '210006' LIMIT 1`
      );

      if (salesRevenueAccount.length && accountsReceivableAccount.length) {
        // Journal Entry: Reverse the original invoice
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (
            entry_number, 
            entry_date, 
            reference, 
            description, 
            total_debit, 
            total_credit, 
            status, 
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-CN-${creditNoteId}-${Date.now()}`,
            credit_note_date,
            creditNoteNumber,
            `Credit note ${creditNoteNumber}`,
            total_amount,
            total_amount,
            1
          ]
        );
        const journalEntryId = journalResult.insertId;

        // Credit Accounts Receivable (decrease receivable)
        await connection.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit_amount, 
            credit_amount, 
            description
          ) VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, accountsReceivableAccount[0].id, total_amount, `Credit note ${creditNoteNumber}`]
        );

        // Debit Sales Revenue (net)
        await connection.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit_amount, 
            credit_amount, 
            description
          ) VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, salesRevenueAccount[0].id, subtotal, `Sales return - ${creditNoteNumber}`]
        );

        // Debit Sales Tax Payable (if tax account exists)
        if (salesTaxAccount.length) {
          await connection.query(
            `INSERT INTO journal_entry_lines (
              journal_entry_id, 
              account_id, 
              debit_amount, 
              credit_amount, 
              description
            ) VALUES (?, ?, ?, 0, ?)`,
            [journalEntryId, salesTaxAccount[0].id, tax_amount, `Sales tax return - ${creditNoteNumber}`]
          );
        }
      }

      await connection.commit();
      console.log('Transaction committed successfully');
      
      res.status(201).json({ 
        success: true, 
        data: { 
          id: creditNoteId, 
          credit_note_number: creditNoteNumber,
          total_amount 
        },
        message: 'Credit note created successfully' 
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
          console.log('Transaction rolled back successfully');
        } catch (rollbackError) {
          console.error('Error rolling back transaction:', rollbackError);
        }
      }
      console.error('Error creating credit note:', error);
      res.status(500).json({ success: false, error: 'Failed to create credit note' });
    } finally {
      if (connection) {
        try {
          connection.release();
          console.log('Database connection released');
        } catch (releaseError) {
          console.error('Error releasing connection:', releaseError);
        }
      }
    }
  },

  // Get credit notes for a specific customer
  getCustomerCreditNotes: async (req, res) => {
    try {
      const { customerId } = req.params;
      const [rows] = await db.query(`
        SELECT 
          cn.*,
          so.so_number as original_invoice_number
        FROM credit_notes cn
        LEFT JOIN sales_orders so ON cn.original_invoice_id = so.id
        WHERE cn.client_id = ?
        ORDER BY cn.created_at DESC
      `, [customerId]);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching customer credit notes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customer credit notes' });
    }
  }
};

module.exports = creditNoteController; 