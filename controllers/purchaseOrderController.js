const db = require('../database/db');

const purchaseOrderController = {
  // Get all purchase orders
  getAllPurchaseOrders: async (req, res) => {
    try {
      const { supplier_id, outstanding } = req.query;
      const whereParts = [];
      const params = [];
      if (supplier_id) {
        whereParts.push('po.supplier_id = ?');
        params.push(supplier_id);
      }
      const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

      let rows;
      try {
        const havingSql = (outstanding && (outstanding === 'true' || outstanding === '1')) ? 'HAVING (po.total_amount - amount_paid) > 0' : '';
        [rows] = await db.query(`
          SELECT 
            po.*,
            s.company_name as supplier_name,
            u.full_name as created_by_name,
            (
              SELECT COALESCE(SUM(amount), 0)
              FROM payments
              WHERE payments.purchase_order_id = po.id AND payments.status = 'confirmed'
            ) as amount_paid
          FROM purchase_orders po
          LEFT JOIN suppliers s ON po.supplier_id = s.id
          LEFT JOIN users u ON po.created_by = u.id
          ${whereSql}
          ${havingSql}
          ORDER BY po.created_at DESC
        `, params);
      } catch (err) {
        // Fallback for legacy schemas without payments.purchase_order_id or payments.status
        console.warn('Falling back to legacy PO query (no payments join):', err?.message);
        const fallbackHaving = (outstanding && (outstanding === 'true' || outstanding === '1')) ? 'HAVING (po.total_amount) > 0' : '';
        [rows] = await db.query(`
          SELECT 
            po.*,
            s.company_name as supplier_name,
            u.full_name as created_by_name
          FROM purchase_orders po
          LEFT JOIN suppliers s ON po.supplier_id = s.id
          LEFT JOIN users u ON po.created_by = u.id
          ${whereSql}
          ${fallbackHaving}
          ORDER BY po.created_at DESC
        `, params);
        // Mark amount_paid = 0 in fallback
        rows = rows.map(r => ({ ...r, amount_paid: 0 }));
      }

      // Add balance_remaining field
      let data = rows.map(po => ({
        ...po,
        balance_remaining: Number(po.total_amount) - Number(po.amount_paid || 0)
      }));

      // No extra in-memory filter; SQL HAVING applies only when outstanding=true

      res.json({ success: true, data });
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch purchase orders' });
    }
  },

  // Get purchase order by ID
  getPurchaseOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get purchase order details
      const [purchaseOrders] = await db.query(`
        SELECT 
          po.*,
          s.company_name as supplier_name,
          u.full_name as created_by_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        WHERE po.id = ?
      `, [id]);
      
      if (purchaseOrders.length === 0) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }

      // Get purchase order items
      const [items] = await db.query(`
        SELECT 
          poi.*,
          p.product_name,
          p.product_code,
          p.unit_of_measure
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = ?
      `, [id]);

      const purchaseOrder = purchaseOrders[0];
      purchaseOrder.items = items;
      
      res.json({ success: true, data: purchaseOrder });
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch purchase order' });
    }
  },

  // Create new purchase order
  createPurchaseOrder: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { 
        supplier_id, 
        order_date, 
        expected_delivery_date, 
        notes, 
        items 
      } = req.body;

      // Generate PO number
      const [poCount] = await connection.query('SELECT COUNT(*) as count FROM purchase_orders');
      const poNumber = `PO-${String(poCount[0].count + 1).padStart(6, '0')}`;

      // Calculate totals using per-item tax type (default 16% when not provided)
      // Client sends tax-inclusive unit_price. Convert to net/tax per line here.
      const calcLine = (it) => {
        const taxType = (it.tax_type || '16%');
        const rate = taxType === '16%' ? 0.16 : 0;
        const grossUnit = Number(it.unit_price);
        const qty = Number(it.quantity);
        const grossLine = qty * grossUnit;
        const netUnit = rate > 0 ? grossUnit / (1 + rate) : grossUnit;
        const netLine = qty * netUnit;
        const taxLine = grossLine - netLine;
        return { netLine, taxLine, taxType, grossLine, netUnit };
      };

      const subtotal = items.reduce((sum, it) => sum + calcLine(it).netLine, 0);
      const taxAmount = items.reduce((sum, it) => sum + calcLine(it).taxLine, 0);
      const totalAmount = subtotal + taxAmount;

      // Create purchase order
      const [poResult] = await connection.query(`
        INSERT INTO purchase_orders (
          po_number, supplier_id, order_date, expected_delivery_date, 
          subtotal, tax_amount, total_amount, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [poNumber, supplier_id, order_date, expected_delivery_date, subtotal, taxAmount, totalAmount, notes, 1]);

      const purchaseOrderId = poResult.insertId;

      // Create purchase order items (store per-item tax as well if columns exist). Persist unit_price/total_price as tax-inclusive.
      for (const item of items) {
        const { netLine, taxLine, taxType, grossLine } = calcLine(item);
        // Try inserting with tax columns; if it fails (older schema), fallback without them
        try {
          await connection.query(`
            INSERT INTO purchase_order_items (
              purchase_order_id, product_id, quantity, unit_price, total_price, tax_amount, tax_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [purchaseOrderId, item.product_id, item.quantity, item.unit_price, grossLine, taxLine, taxType]);
        } catch (e) {
          await connection.query(`
            INSERT INTO purchase_order_items (
              purchase_order_id, product_id, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?)
          `, [purchaseOrderId, item.product_id, item.quantity, item.unit_price, grossLine]);
        }
      }

      await connection.commit();

      // Get the created purchase order
      const [createdPO] = await db.query(`
        SELECT 
          po.*,
          s.company_name as supplier_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.id = ?
      `, [purchaseOrderId]);

      res.status(201).json({ 
        success: true, 
        data: createdPO[0],
        message: 'Purchase order created successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating purchase order:', error);
      res.status(500).json({ success: false, error: 'Failed to create purchase order' });
    } finally {
      connection.release();
    }
  },

  // Update purchase order
  updatePurchaseOrder: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const { 
        supplier_id, 
        order_date, 
        expected_delivery_date, 
        notes, 
        items 
      } = req.body;

      // Check if purchase order exists
      const [existingPO] = await connection.query('SELECT id FROM purchase_orders WHERE id = ?', [id]);
      if (existingPO.length === 0) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }

      // Client sends tax-inclusive unit_price. Convert to net/tax per line here.
      const calcLine = (it) => {
        const taxType = (it.tax_type || '16%');
        const rate = taxType === '16%' ? 0.16 : 0;
        const grossUnit = Number(it.unit_price);
        const qty = Number(it.quantity);
        const grossLine = qty * grossUnit;
        const netUnit = rate > 0 ? grossUnit / (1 + rate) : grossUnit;
        const netLine = qty * netUnit;
        const taxLine = grossLine - netLine;
        return { netLine, taxLine, taxType, grossLine, netUnit };
      };

      const subtotal = items.reduce((sum, it) => sum + calcLine(it).netLine, 0);
      const taxAmount = items.reduce((sum, it) => sum + calcLine(it).taxLine, 0);
      const totalAmount = subtotal + taxAmount;

      // Update purchase order
      await connection.query(`
        UPDATE purchase_orders 
        SET supplier_id = ?, order_date = ?, expected_delivery_date = ?, 
            subtotal = ?, tax_amount = ?, total_amount = ?, notes = ?
        WHERE id = ?
      `, [supplier_id, order_date, expected_delivery_date, subtotal, taxAmount, totalAmount, notes, id]);

      // Delete existing items
      await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);

      // Create new items (store per-item tax as well if columns exist). Persist unit_price/total_price as tax-inclusive.
      for (const item of items) {
        const { netLine, taxLine, taxType, grossLine } = calcLine(item);
        try {
          await connection.query(`
            INSERT INTO purchase_order_items (
              purchase_order_id, product_id, quantity, unit_price, total_price, tax_amount, tax_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [id, item.product_id, item.quantity, item.unit_price, grossLine, taxLine, taxType]);
        } catch (e) {
          await connection.query(`
            INSERT INTO purchase_order_items (
              purchase_order_id, product_id, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?)
          `, [id, item.product_id, item.quantity, item.unit_price, grossLine]);
        }
      }

      await connection.commit();

      res.json({ success: true, message: 'Purchase order updated successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating purchase order:', error);
      res.status(500).json({ success: false, error: 'Failed to update purchase order' });
    } finally {
      connection.release();
    }
  },

  // Delete purchase order
  deletePurchaseOrder: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;

      // Check if purchase order exists
      const [existingPO] = await connection.query('SELECT id FROM purchase_orders WHERE id = ?', [id]);
      if (existingPO.length === 0) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }

      // Delete items first
      await connection.query('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [id]);

      // Delete purchase order
      await connection.query('DELETE FROM purchase_orders WHERE id = ?', [id]);

      await connection.commit();

      res.json({ success: true, message: 'Purchase order deleted successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting purchase order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete purchase order' });
    } finally {
      connection.release();
    }
  },

  // Update purchase order status
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const [result] = await db.query(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }

      res.json({ success: true, message: 'Purchase order status updated successfully' });
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      res.status(500).json({ success: false, error: 'Failed to update purchase order status' });
    }
  },

  // Receive items into store inventory
  receiveItems: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { purchaseOrderId } = req.params;
      const { storeId, items, notes } = req.body; // items: [{product_id, received_quantity, unit_cost}]

      // Verify purchase order exists
      const [purchaseOrders] = await connection.query(
        'SELECT * FROM purchase_orders WHERE id = ?',
        [purchaseOrderId]
      );

      if (purchaseOrders.length === 0) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }

      // Verify store exists
      const [stores] = await connection.query(
        'SELECT * FROM stores WHERE id = ? AND is_active = true',
        [storeId]
      );

      if (stores.length === 0) {
        return res.status(404).json({ success: false, error: 'Store not found' });
      }

      // Process each received item
      for (const item of items) {
        const { product_id, received_quantity, unit_cost } = item;
        const total_cost = received_quantity * unit_cost;

        // Record the receipt
        await connection.query(`
          INSERT INTO inventory_receipts (
            purchase_order_id, product_id, store_id, received_quantity, 
            unit_cost, total_cost, received_by, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [purchaseOrderId, product_id, storeId, received_quantity, unit_cost, total_cost, 1, notes]);

        // Update store inventory (running balance)
        await connection.query(`
          INSERT INTO store_inventory (store_id, product_id, quantity) 
          VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE 
          quantity = quantity + ?
        `, [storeId, product_id, received_quantity, received_quantity]);

        // --- Insert into inventory_transactions ---
        // Get last balance for this product/store
        const [lastTrans] = await connection.query(
          'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
          [product_id, storeId]
        );
        const prevBalance = lastTrans.length > 0 ? parseFloat(lastTrans[0].balance) : 0;
        const newBalance = prevBalance + received_quantity;
        await connection.query(
          `INSERT INTO inventory_transactions 
            (product_id, reference, amount_in, amount_out, unit_cost, total_cost, balance, date_received, store_id, staff_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
          [product_id, purchaseOrders[0].po_number, received_quantity, 0, unit_cost, total_cost, newBalance, storeId, 1]
        );
        // --- End inventory_transactions insert ---

        // Update purchase order item received quantity
        await connection.query(`
          UPDATE purchase_order_items 
          SET received_quantity = received_quantity + ? 
          WHERE purchase_order_id = ? AND product_id = ?
        `, [received_quantity, purchaseOrderId, product_id]);
      }

      // Check if all items are fully received
      const [orderItems] = await connection.query(`
        SELECT 
          SUM(quantity) as total_ordered,
          SUM(received_quantity) as total_received
        FROM purchase_order_items 
        WHERE purchase_order_id = ?
      `, [purchaseOrderId]);

      const { total_ordered, total_received } = orderItems[0];
      
      // Update purchase order status if fully received
      if (total_received >= total_ordered) {
        await connection.query(
          'UPDATE purchase_orders SET status = ? WHERE id = ?',
          ['received', purchaseOrderId]
        );
      } else {
        await connection.query(
          'UPDATE purchase_orders SET status = ? WHERE id = ?',
          ['partially_received', purchaseOrderId]
        );
      }

      // Calculate total value received for this receipt
      let totalReceiptValue = 0;
      for (const item of items) {
        totalReceiptValue += item.received_quantity * item.unit_cost;
      }

      // Get supplier_id from purchase order
      const supplier_id = purchaseOrders[0].supplier_id;
      const po_number = purchaseOrders[0].po_number;

      // Set invoice_number on purchase order if not already set
      if (!purchaseOrders[0].invoice_number) {
        const invRef = `INV-${String(purchaseOrderId).padStart(6, '0')}`;
        await connection.query('UPDATE purchase_orders SET invoice_number = ? WHERE id = ?', [invRef, purchaseOrderId]);
      }

      // Insert into supplier_ledger (credit, increases balance)
      // Get last running balance
      const [lastLedger] = await connection.query(
        'SELECT running_balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [supplier_id]
      );
      const prevBalance = lastLedger.length > 0 ? parseFloat(lastLedger[0].running_balance) : 0;
      const newBalance = prevBalance + totalReceiptValue;
      await connection.query(
        `INSERT INTO supplier_ledger (supplier_id, date, description, reference_type, reference_id, debit, credit, running_balance)
         VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [
          supplier_id,
          `Goods received for PO ${po_number}`,
          'purchase_order',
          purchaseOrderId,
          0,
          totalReceiptValue,
          newBalance
        ]
      );

      // Update Accounts Payable in chart_of_accounts (account_code '2000')
      await connection.query(
        `UPDATE chart_of_accounts SET 
          updated_at = NOW(),
          description = CONCAT(description, ' | Last PO received: ', ?)
         WHERE account_code = '2000'`,
        [po_number]
      );

      // Create a journal entry: Debit Inventory, Credit Accounts Payable
      // Get account IDs
      const [inventoryAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '100001' LIMIT 1`
      );
      const [apAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '210000' LIMIT 1`
      );
      if (inventoryAccount.length && apAccount.length) {
        // Create journal entry
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, CURDATE(), ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-PO-${purchaseOrderId}-${Date.now()}`,
            po_number,
            `Goods received for PO ${po_number}`,
            totalReceiptValue,
            totalReceiptValue,
            1 // created_by (system/admin)
          ]
        );
        const journalEntryId = journalResult.insertId;
        // Debit Inventory
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, inventoryAccount[0].id, totalReceiptValue, `Goods received for PO ${po_number}`]
        );
        // Credit Accounts Payable
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, apAccount[0].id, totalReceiptValue, `Goods received for PO ${po_number}`]
        );
      }

      await connection.commit();

      res.json({ 
        success: true, 
        message: 'Items received successfully into store inventory',
        data: {
          total_ordered,
          total_received,
          status: total_received >= total_ordered ? 'received' : 'partially_received'
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error receiving items:', error);
      res.status(500).json({ success: false, error: 'Failed to receive items' });
    } finally {
      connection.release();
    }
  },

  // Get purchase order with receipt history
  getPurchaseOrderWithReceipts: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get purchase order details
      const [purchaseOrders] = await db.query(`
        SELECT 
          po.*,
          s.company_name as supplier_name,
          u.full_name as created_by_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        WHERE po.id = ?
      `, [id]);
      
      if (purchaseOrders.length === 0) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }

      // Get purchase order items
      const [items] = await db.query(`
        SELECT 
          poi.*,
          p.product_name,
          p.product_code,
          p.unit_of_measure
        FROM purchase_order_items poi
        LEFT JOIN products p ON poi.product_id = p.id
        WHERE poi.purchase_order_id = ?
      `, [id]);

      // Get receipt history
      const [receipts] = await db.query(`
        SELECT 
          ir.*,
          p.product_name,
          p.product_code,
          s.store_name,
          u.full_name as received_by_name
        FROM inventory_receipts ir
        LEFT JOIN products p ON ir.product_id = p.id
        LEFT JOIN stores s ON ir.store_id = s.id
        LEFT JOIN users u ON ir.received_by = u.id
        WHERE ir.purchase_order_id = ?
        ORDER BY ir.received_at DESC
      `, [id]);

      const purchaseOrder = purchaseOrders[0];
      purchaseOrder.items = items;
      purchaseOrder.receipts = receipts;
      
      res.json({ success: true, data: purchaseOrder });
    } catch (error) {
      console.error('Error fetching purchase order with receipts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch purchase order' });
    }
  }
};

module.exports = purchaseOrderController; 