const db = require('../database/db');

const invoiceController = {
  // Create a new invoice
  createInvoice: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { customer_id, invoice_date, due_date, notes, items } = req.body;

      // Generate invoice number
      const invoiceNumber = `INV-${customer_id}-${Date.now()}`;

      // Calculate totals (tax-inclusive)
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

      // Insert invoice
      const [invoiceResult] = await connection.query(
        `INSERT INTO sales_orders (so_number, client_id, order_date, expected_delivery_date, status, subtotal, tax_amount, total_amount, notes, created_by)
         VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)`,
        [
          invoiceNumber,
          customer_id,
          invoice_date,
          due_date,
          subtotal,
          tax_amount,
          total_amount,
          notes || '',
          1 // created_by
        ]
      );
      const invoiceId = invoiceResult.insertId;

      // Insert invoice items
      for (const item of items) {
        const itemTotal = item.quantity * item.unit_price;
        const itemNet = itemTotal / TAX_DIVISOR;
        const itemTax = itemTotal - itemNet;
        await connection.query(
          `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, total_price, net_price, tax_amount)` +
          ` VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            item.product_id,
            item.quantity,
            item.unit_price,
            itemTotal,
            itemNet,
            itemTax
          ]
        );
      }

      // Insert into customer_ledger (debit, increases receivable)
      const [lastCustomerLedger] = await connection.query(
        'SELECT running_balance FROM customer_ledger WHERE customer_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [customer_id]
      );
      const prevBalance = lastCustomerLedger.length > 0 ? parseFloat(lastCustomerLedger[0].running_balance) : 0;
      const newBalance = prevBalance + total_amount;

      await connection.query(
        `INSERT INTO customer_ledger (customer_id, date, description, reference_type, reference_id, debit, credit, running_balance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          invoice_date,
          `Invoice ${invoiceNumber}`,
          'sales_order',
          invoiceId,
          total_amount,
          0,
          newBalance
        ]
      );

      // Update the Clients table balance column
      try {
        await connection.query(
          'UPDATE Clients SET balance = ? WHERE id = ?',
          [newBalance, customer_id]
        );
        console.log('Clients table balance updated successfully for invoice creation');
      } catch (balanceError) {
        console.warn('Failed to update Clients table balance:', balanceError.message);
        // Continue with the transaction even if balance update fails
      }

      // Create comprehensive journal entries
      const [salesRevenueAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '400001' LIMIT 1`
      );
      const [accountsReceivableAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1`
      );
      
      // If accounts receivable not found by code, try to find by account_type = 2
      let arAccount = accountsReceivableAccount;
      if (!arAccount.length) {
        [arAccount] = await connection.query(
          `SELECT id FROM chart_of_accounts WHERE account_type = 2 LIMIT 1`
        );
      }
      
      const [costOfGoodsAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '500000' LIMIT 1`
      );
      const [inventoryAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '100001' LIMIT 1`
      );
      const [salesTaxAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '210006' LIMIT 1`
      );

      if (!salesRevenueAccount.length) console.error('Sales Revenue account not found!');
      if (!arAccount.length) console.error('Accounts Receivable account not found!');
      if (!costOfGoodsAccount.length) console.error('COGS account not found!');
      if (!inventoryAccount.length) console.error('Inventory account not found!');
      if (!salesTaxAccount.length) console.warn('Sales Tax account not found!');

      // Journal entries: use subtotal (net) and tax_amount
      if (salesRevenueAccount.length && arAccount.length) {
        // Journal Entry 1: Sales Revenue and Accounts Receivable
        const [journalResult1] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-SALES-${invoiceId}-${Date.now()}`,
            invoice_date,
            invoiceNumber,
            `Sales invoice ${invoiceNumber}`,
            total_amount,
            total_amount,
            1
          ]
        );
        const journalEntryId1 = journalResult1.insertId;

        // Debit Accounts Receivable
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId1, arAccount[0].id, total_amount, `Invoice ${invoiceNumber}`]
        );

        // Credit Sales Revenue (net)
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId1, salesRevenueAccount[0].id, subtotal, `Sales revenue - ${invoiceNumber}`]
        );

        // Credit Sales Tax Payable (if tax account exists)
        if (salesTaxAccount.length) {
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, 0, ?, ?)`,
            [journalEntryId1, salesTaxAccount[0].id, tax_amount, `Sales tax - ${invoiceNumber}`]
          );
        }
      }

      // Calculate total cost of goods sold
      let totalCOGS = 0;
      for (const item of items) {
        // Get product cost price
        const [productResult] = await connection.query(
          'SELECT cost_price FROM products WHERE id = ?',
          [item.product_id]
        );
        if (productResult.length > 0) {
          const costPrice = parseFloat(productResult[0].cost_price);
          totalCOGS += item.quantity * costPrice;
        }
      }

      // Journal Entry 2: Cost of Goods Sold and Inventory (if COGS > 0)
      if (totalCOGS > 0 && costOfGoodsAccount.length && inventoryAccount.length) {
        const [journalResult2] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-COGS-${invoiceId}-${Date.now()}`,
            invoice_date,
            invoiceNumber,
            `Cost of goods sold for ${invoiceNumber}`,
            totalCOGS,
            totalCOGS,
            1
          ]
        );
        const journalEntryId2 = journalResult2.insertId;

        // Debit Cost of Goods Sold
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId2, costOfGoodsAccount[0].id, totalCOGS, `COGS - ${invoiceNumber}`]
        );

        // Credit Inventory
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId2, inventoryAccount[0].id, totalCOGS, `Inventory reduction - ${invoiceNumber}`]
        );
      }

      // Update product inventory levels
      for (const item of items) {
        await connection.query(
          `UPDATE products SET current_stock = current_stock - ? WHERE id = ?`,
          [item.quantity, item.product_id]
        );
      }

      // Update Accounts Receivable in chart_of_accounts
      await connection.query(
        `UPDATE chart_of_accounts SET 
          description = CONCAT(description, ' | Last invoice: ', ?)
         WHERE account_code = '1100'`,
        [invoiceNumber]
      );

      await connection.commit();
      res.status(201).json({ 
        success: true, 
        data: { id: invoiceId, invoice_number: invoiceNumber },
        message: 'Invoice created successfully with complete accounting entries' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating invoice:', error);
      res.status(500).json({ success: false, error: 'Failed to create invoice' });
    } finally {
      connection.release();
    }
  },

  // Get all invoices
  getAllInvoices: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          so.*,
          c.name as customer_name,
          c.email as customer_email
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        ORDER BY so.order_date DESC, so.id DESC
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
    }
  },

  // Get invoice by ID
  getInvoiceById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get invoice details
      const [invoiceRows] = await db.query(`
        SELECT 
          so.*,
          c.name as customer_name,
          c.email as customer_email,
          c.contact as customer_phone,
          c.address as customer_address
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        WHERE so.id = ?
      `, [id]);

      if (invoiceRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }

      // Get invoice items
      const [itemRows] = await db.query(`
        SELECT 
          soi.*,
          p.product_name,
          p.product_code
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
      `, [id]);

      const invoice = invoiceRows[0];
      invoice.items = itemRows;

      res.json({ success: true, data: invoice });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
    }
  },

  // Get customer ledger for a specific customer
  getCustomerLedger: async (req, res) => {
    try {
      const { customer_id } = req.query;
      if (!customer_id) return res.status(400).json({ success: false, error: 'customer_id is required' });
      const [rows] = await db.query(
        `SELECT * FROM customer_ledger WHERE customer_id = ? ORDER BY date DESC, id DESC`,
        [customer_id]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching customer ledger:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customer ledger' });
    }
  }
};

module.exports = invoiceController; 