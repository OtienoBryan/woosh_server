const db = require('../database/db');

// Helper function to record inventory transactions
const recordInventoryTransaction = async ({ storeId, productId, quantity, referenceId, notes, db, newQuantity }) => {
  try {
    // Generate a unique reference number
    const timestamp = Date.now();
    const reference = `CNR-${timestamp}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Get product details for unit cost (attempt to fetch from credit note item or use default)
    let unitCost = 0;
    let totalCost = 0;
    
    try {
      const [productData] = await db.query('SELECT cost_price FROM products WHERE id = ?', [productId]);
      if (productData.length > 0) {
        unitCost = productData[0].cost_price || 0;
        totalCost = unitCost * quantity;
      }
    } catch (productError) {
      console.log('Could not fetch product cost, using 0');
    }

    // Use the new quantity passed from the caller (after inventory update)
    const newBalance = newQuantity || quantity;

    // Insert into the actual inventory_transactions table structure
    await db.query(`
      INSERT INTO inventory_transactions 
      (product_id, reference, amount_in, amount_out, balance, date_received, store_id, unit_cost, total_cost, staff_id) 
      VALUES (?, ?, ?, 0.00, ?, NOW(), ?, ?, ?, 1)
    `, [productId, reference, quantity, newBalance, storeId, unitCost, totalCost]);
    
    console.log(`✅ Inventory transaction recorded: ${reference} - ${quantity} units received`);
    
  } catch (error) {
    console.error('Error recording inventory transaction:', error.message);
    // Don't throw - allow the main operation to continue
    
    // Fallback: log the transaction details
    console.log(`📝 Inventory transaction (failed to record): Store ${storeId}, Product ${productId}, Qty +${quantity}, Reference: Credit Note ${referenceId}`);
  }
};

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
          c.address,
          s.name as staff_name,
          creator.name as creator_name,
          store.store_name as damage_store_name
        FROM credit_notes cn
        LEFT JOIN Clients c ON cn.client_id = c.id
        LEFT JOIN staff s ON cn.received_by = s.id
        LEFT JOIN staff creator ON cn.created_by = creator.id
        LEFT JOIN stores store ON cn.damage_store_id = store.id
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
          c.address,
          s.name as staff_name,
          creator.name as creator_name,
          store.store_name as damage_store_name
        FROM credit_notes cn
        LEFT JOIN Clients c ON cn.client_id = c.id
        LEFT JOIN staff s ON cn.received_by = s.id
        LEFT JOIN staff creator ON cn.created_by = creator.id
        LEFT JOIN stores store ON cn.damage_store_id = store.id
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
        original_invoice_ids, // Support multiple invoices
        items,
        scenario_type = 'faulty_no_stock', // 'faulty_no_stock' or 'faulty_with_stock'
        damage_store_id = null // Required for scenario 2
      } = req.body;

      // Handle both original_invoice_id and original_invoice_ids
      const primaryInvoiceId = original_invoice_id || (original_invoice_ids && original_invoice_ids.length > 0 ? original_invoice_ids[0] : null);

      // Validate scenario 2 requires store
      if (scenario_type === 'faulty_with_stock' && !damage_store_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'Store selection is required for expired/damaged/faulty products from stock scenario' 
        });
      }

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
          scenario_type,
          damage_store_id,
          subtotal, 
          tax_amount, 
          total_amount, 
          status,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
        [
          creditNoteNumber,
          customer_id,
          credit_note_date,
          primaryInvoiceId,
          reason || '',
          scenario_type,
          damage_store_id,
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
             item.invoice_id || primaryInvoiceId,
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

      // Create journal entries for credit note based on scenario
      const [accountsReceivableAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_type = 2 LIMIT 1`
      );
      const [salesTaxAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '210006' LIMIT 1`
      );

      if (!accountsReceivableAccount.length) {
        throw new Error('Accounts Receivable account not found');
      }

      if (scenario_type === 'faulty_no_stock') {
        // Scenario 1: Faulty products (no stock return)
        // Dr. Damages/faulty account (P&L), Dr. Sales VAT, Cr. Debtors account
        
        // Find or create damages/faulty account (P&L expense account)
        let [damagesAccount] = await connection.query(
          `SELECT id FROM chart_of_accounts 
           WHERE (account_name LIKE '%damage%' OR account_name LIKE '%faulty%' OR account_name LIKE '%defect%')
           AND account_type IN (5, 16, 18) 
           LIMIT 1`
        );
        
        // If not found, try to find any expense account with account_type 16 or 18
        if (!damagesAccount.length) {
          [damagesAccount] = await connection.query(
            `SELECT id FROM chart_of_accounts 
             WHERE account_type IN (16, 18) 
             AND is_active = 1 
             ORDER BY account_code 
             LIMIT 1`
          );
        }
        
        if (!damagesAccount.length) {
          throw new Error('Damages/Faulty account not found. Please create an expense account for damages.');
        }

        // Create journal entry
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
            `Credit note ${creditNoteNumber} - Faulty products (no stock)`,
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

        // Debit Damages/Faulty account (P&L)
        await connection.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit_amount, 
            credit_amount, 
            description
          ) VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, damagesAccount[0].id, subtotal, `Damages/Faulty products - ${creditNoteNumber}`]
        );

        // Debit Sales Tax Payable (if tax account exists)
        if (salesTaxAccount.length && tax_amount > 0) {
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

      } else if (scenario_type === 'faulty_with_stock') {
        // Scenario 2: Expired/damaged/faulty products from stock
        // Dr. Faulty account (P&L), Cr. Store (inventory), Cr. Cost of sale account
        
        // Find or create damages/faulty account (P&L expense account)
        let [damagesAccount] = await connection.query(
          `SELECT id FROM chart_of_accounts 
           WHERE (account_name LIKE '%damage%' OR account_name LIKE '%faulty%' OR account_name LIKE '%defect%')
           AND account_type IN (5, 16, 18) 
           LIMIT 1`
        );
        
        // If not found, try to find any expense account with account_type 16 or 18
        if (!damagesAccount.length) {
          [damagesAccount] = await connection.query(
            `SELECT id FROM chart_of_accounts 
             WHERE account_type IN (16, 18) 
             AND is_active = 1 
             ORDER BY account_code 
             LIMIT 1`
          );
        }
        
        if (!damagesAccount.length) {
          throw new Error('Damages/Faulty account not found. Please create an expense account for damages.');
        }

        // Find inventory account (store inventory)
        const [inventoryAccount] = await connection.query(
          `SELECT id FROM chart_of_accounts WHERE account_code = '100001' LIMIT 1`
        );
        
        if (!inventoryAccount.length) {
          throw new Error('Inventory account not found');
        }

        // Find cost of goods sold account
        const [cogsAccount] = await connection.query(
          `SELECT id FROM chart_of_accounts 
           WHERE (account_code = '500000' OR account_name LIKE '%cost of goods%' OR account_name LIKE '%cogs%')
           AND account_type IN (5, 16) 
           LIMIT 1`
        );
        
        if (!cogsAccount.length) {
          throw new Error('Cost of Goods Sold account not found');
        }

        // Calculate total cost of goods (for inventory and COGS entries)
        let totalCost = 0;
        for (const item of items) {
          const [productData] = await connection.query(
            'SELECT cost_price FROM products WHERE id = ?',
            [item.product_id]
          );
          if (productData.length > 0) {
            const costPrice = parseFloat(productData[0].cost_price) || 0;
            totalCost += item.quantity * costPrice;
          }
        }

        // Create journal entry
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
            `Credit note ${creditNoteNumber} - Faulty products (with stock return)`,
            total_amount + totalCost,
            total_amount + totalCost,
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

        // Debit Damages/Faulty account (P&L) - for the sales value
        await connection.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit_amount, 
            credit_amount, 
            description
          ) VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, damagesAccount[0].id, subtotal, `Damages/Faulty products - ${creditNoteNumber}`]
        );

        // Debit Sales Tax Payable (if tax account exists)
        if (salesTaxAccount.length && tax_amount > 0) {
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

        // Credit Inventory (store) - return inventory to damage store
        await connection.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit_amount, 
            credit_amount, 
            description
          ) VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, inventoryAccount[0].id, totalCost, `Inventory return to damage store - ${creditNoteNumber}`]
        );

        // Credit Cost of Goods Sold - reverse COGS
        await connection.query(
          `INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id, 
            debit_amount, 
            credit_amount, 
            description
          ) VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, cogsAccount[0].id, totalCost, `COGS reversal - ${creditNoteNumber}`]
        );

        // Update inventory for the damage store
        for (const item of items) {
          const { product_id, quantity } = item;
          
          // Check if product exists in the damage store inventory
          const [existingInventory] = await connection.query(
            'SELECT id, quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
            [damage_store_id, product_id]
          );

          let finalQuantity;
          if (existingInventory.length === 0) {
            // Create new inventory record
            finalQuantity = quantity;
            await connection.query(
              'INSERT INTO store_inventory (store_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
              [damage_store_id, product_id, quantity]
            );
          } else {
            // Update existing inventory
            const oldQuantity = existingInventory[0].quantity;
            finalQuantity = oldQuantity + quantity;
            await connection.query(
              'UPDATE store_inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE store_id = ? AND product_id = ?',
              [finalQuantity, damage_store_id, product_id]
            );
          }

          // Record inventory transaction
          await recordInventoryTransaction({
            storeId: damage_store_id,
            productId: product_id,
            quantity: quantity,
            referenceId: creditNoteId,
            notes: `Received from credit note ${creditNoteNumber} - Faulty products`,
            db: connection,
            newQuantity: finalQuantity
          });
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
          so.so_number as original_invoice_number,
          s.name as staff_name,
          creator.name as creator_name
        FROM credit_notes cn
        LEFT JOIN sales_orders so ON cn.original_invoice_id = so.id
        LEFT JOIN staff s ON cn.received_by = s.id
        LEFT JOIN staff creator ON cn.created_by = creator.id
        WHERE cn.client_id = ?
        ORDER BY cn.created_at DESC
      `, [customerId]);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching customer credit notes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customer credit notes' });
    }
  },

  // Receive back items to stock from credit note
  receiveBackToStock: async (req, res) => {
    try {
      // Check if user has stock role
      if (req.user.role !== 'stock' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only users with stock role can receive items back to stock.'
        });
      }

      const { creditNoteId, items } = req.body;

      if (!creditNoteId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Credit note ID and items are required'
        });
      }

      // Validate items structure
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.storeId) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have productId, quantity, and storeId'
          });
        }
      }

      // Verify credit note exists
      const [creditNote] = await db.query(
        'SELECT id, status FROM credit_notes WHERE id = ?',
        [creditNoteId]
      );

      if (creditNote.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Credit note not found'
        });
      }

      // Process each item - update store inventory
      console.log('📦 Received items for processing:', items);
      for (const item of items) {
        const { productId, quantity, storeId } = item;
        console.log(`📦 Processing item:`, { productId, quantity, storeId, itemType: typeof quantity });
        
        // Ensure quantity is a number
        const numericQuantity = Number(quantity);
        if (isNaN(numericQuantity) || numericQuantity <= 0) {
          console.error(`❌ Invalid quantity for product ${productId}: ${quantity}`);
          continue; // Skip this item
        }

        // Check if the product exists in the store inventory
        const [existingInventory] = await db.query(
          'SELECT id, quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
          [storeId, productId]
        );

        console.log(`🔍 Processing item: Product ${productId}, Store ${storeId}, Quantity ${numericQuantity}`);
        console.log(`🔍 Existing inventory:`, existingInventory);

        let finalQuantity;
        if (existingInventory.length === 0) {
          // Create new inventory record
          finalQuantity = numericQuantity;
          console.log(`➕ Creating new inventory: ${finalQuantity} units`);
          await db.query(
            'INSERT INTO store_inventory (store_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
            [storeId, productId, numericQuantity]
          );
        } else {
          // Update existing inventory
          const oldQuantity = existingInventory[0].quantity;
          finalQuantity = oldQuantity + numericQuantity;
          console.log(`🔄 Updating inventory: ${oldQuantity} + ${numericQuantity} = ${finalQuantity} units`);
          await db.query(
            'UPDATE store_inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE store_id = ? AND product_id = ?',
            [finalQuantity, storeId, productId]
          );
        }

        console.log(`✅ Final inventory quantity: ${finalQuantity}`);

        // Record the inventory transaction AFTER updating inventory
        await recordInventoryTransaction({
          storeId,
          productId,
          quantity: numericQuantity,
          referenceId: creditNoteId,
          notes: `Received back from credit note ${creditNote[0]?.credit_note_number || creditNoteId}`,
          db,
          newQuantity: finalQuantity // Pass the final quantity for accurate balance
        });
      }

      // Update credit note my_status to 1 (processed/received back to stock)
      // Also update received_by and received_at with the logged-in user's ID and current timestamp
      try {
        const userId = req.user.id || req.user.userId || 1; // Default to 1 if user ID not available
        
        // Get current local date and time in your timezone
        const now = new Date();
        const currentTimestamp = now.getFullYear() + '-' + 
          String(now.getMonth() + 1).padStart(2, '0') + '-' + 
          String(now.getDate()).padStart(2, '0') + ' ' + 
          String(now.getHours()).padStart(2, '0') + ':' + 
          String(now.getMinutes()).padStart(2, '0') + ':' + 
          String(now.getSeconds()).padStart(2, '0');
        
        await db.query(
          'UPDATE credit_notes SET my_status = 1, received_by = ?, received_at = ? WHERE id = ?',
          [userId, currentTimestamp, creditNoteId]
        );
        
        console.log(`✅ Credit note ${creditNoteId} updated: my_status=1, received_by=${userId}, received_at=${currentTimestamp}`);
      } catch (statusError) {
        // If columns don't exist, log but continue
        console.log('Error updating credit note status:', statusError.message);
        
        // Try updating just my_status if the new columns don't exist
        try {
          await db.query(
            'UPDATE credit_notes SET my_status = 1 WHERE id = ?',
            [creditNoteId]
          );
          console.log(`✅ Credit note ${creditNoteId} updated: my_status=1 (legacy mode)`);
        } catch (legacyError) {
          console.log('my_status column not available in credit_notes table:', legacyError.message);
        }
      }

      res.json({
        success: true,
        message: 'Items successfully received back to inventory',
        data: {
          creditNoteId,
          itemsProcessed: items.length,
          totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
        }
      });

    } catch (error) {
      console.error('Error receiving back to stock:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to receive back items to stock'
      });
    }
  },

  // Get new credit notes count (optimized endpoint)
  getNewCreditNotesCount: async (req, res) => {
    try {
      const [result] = await db.query(`
        SELECT COUNT(*) as count
        FROM credit_notes 
        WHERE my_status = 0 OR my_status = '0'
      `);
      
      res.json({ success: true, data: { count: result[0].count } });
    } catch (error) {
      console.error('Error fetching new credit notes count:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch new credit notes count' });
    }
  }
};

module.exports = creditNoteController; 