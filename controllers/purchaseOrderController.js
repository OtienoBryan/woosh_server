const db = require('../database/db');

const purchaseOrderController = {
  // Get all purchase orders
  getAllPurchaseOrders: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          po.*,
          s.company_name as supplier_name,
          u.full_name as created_by_name
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        LEFT JOIN users u ON po.created_by = u.id
        ORDER BY po.created_at DESC
      `);
      res.json({ success: true, data: rows });
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

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * 0.1; // 10% tax
      const totalAmount = subtotal + taxAmount;

      // Create purchase order
      const [poResult] = await connection.query(`
        INSERT INTO purchase_orders (
          po_number, supplier_id, order_date, expected_delivery_date, 
          subtotal, tax_amount, total_amount, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [poNumber, supplier_id, order_date, expected_delivery_date, subtotal, taxAmount, totalAmount, notes, 1]);

      const purchaseOrderId = poResult.insertId;

      // Create purchase order items
      for (const item of items) {
        await connection.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?)
        `, [purchaseOrderId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
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

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * 0.1;
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

      // Create new items
      for (const item of items) {
        await connection.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?)
        `, [id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
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