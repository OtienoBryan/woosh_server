const db = require('../database/db');

const storeController = {
  // Get all stores
  getAllStores: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT * FROM stores 
        WHERE is_active = true 
        ORDER BY store_name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching stores:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stores' });
    }
  },

  // Get store by ID
  getStoreById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM stores WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Store not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching store:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store' });
    }
  },

  // Get store inventory (running balance for a specific store)
  getStoreInventory: async (req, res) => {
    try {
      const { storeId } = req.params;
      
      const [rows] = await db.query(`
        SELECT 
          si.*,
          p.product_name,
          p.product_code,
          p.category,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price
        FROM store_inventory si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.store_id = ? AND p.is_active = true
        ORDER BY p.product_name
      `, [storeId]);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching store inventory:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store inventory' });
    }
  },

  // Get all stores inventory summary
  getAllStoresInventory: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          si.store_id as store_id,
          s.store_name,
          s.store_code,
          p.product_name,
          p.product_code,
          p.category,
          si.quantity,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price,
          (COALESCE(si.quantity, 0) * COALESCE(p.cost_price, 0)) as inventory_value
        FROM store_inventory si
        LEFT JOIN stores s ON si.store_id = s.id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.is_active = true AND p.is_active = true
        ORDER BY s.store_name, p.product_name
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching all stores inventory:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stores inventory' });
    }
  },

  // Get inventory summary by store
  getInventorySummaryByStore: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          s.id,
          s.store_name,
          s.store_code,
          COUNT(si.product_id) as total_products,
          SUM(si.quantity) as total_items,
          SUM(si.quantity * p.cost_price) as total_inventory_value
        FROM stores s
        LEFT JOIN store_inventory si ON s.id = si.store_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.is_active = true
        GROUP BY s.id, s.store_name, s.store_code
        ORDER BY s.store_name
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch inventory summary' });
    }
  },

  // Get inventory transactions for a product or store
  getInventoryTransactions: async (req, res) => {
    try {
      const { product_id, store_id, page = 1, limit = 50 } = req.query;
      let sql = 'SELECT it.*, p.product_name, s.store_name, u.full_name as staff_name FROM inventory_transactions it LEFT JOIN products p ON it.product_id = p.id LEFT JOIN stores s ON it.store_id = s.id LEFT JOIN users u ON it.staff_id = u.id WHERE 1=1';
      const params = [];
      if (product_id) {
        sql += ' AND it.product_id = ?';
        params.push(product_id);
      }
      if (store_id) {
        sql += ' AND it.store_id = ?';
        params.push(store_id);
      }
      sql += ' ORDER BY it.date_received DESC, it.id DESC';
      // Pagination
      const pageNum = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 50;
      const offset = (pageNum - 1) * pageSize;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);
      // Get total count for pagination
      let countSql = 'SELECT COUNT(*) as total FROM inventory_transactions WHERE 1=1';
      const countParams = [];
      if (product_id) {
        countSql += ' AND product_id = ?';
        countParams.push(product_id);
      }
      if (store_id) {
        countSql += ' AND store_id = ?';
        countParams.push(store_id);
      }
      const [[countRow]] = await db.query(countSql, countParams);
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / pageSize) || 1;
      // Get paginated data
      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows, pagination: { total, totalPages, page: pageNum, limit: pageSize } });
    } catch (error) {
      console.error('Error fetching inventory transactions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch inventory transactions' });
    }
  },

  // Get inventory as of a specific date
  getInventoryAsOfDate: async (req, res) => {
    try {
      const { date, store_id } = req.query;
      if (!date) {
        return res.status(400).json({ success: false, error: 'Date is required' });
      }
      let sql = `
        SELECT
          it.store_id,
          s.store_name,
          it.product_id,
          p.product_name,
          p.product_code,
          p.category,
          SUM(it.amount_in) - SUM(it.amount_out) AS quantity,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price,
          (SUM(it.amount_in) - SUM(it.amount_out)) * p.cost_price AS inventory_value
        FROM inventory_transactions it
        LEFT JOIN products p ON it.product_id = p.id
        LEFT JOIN stores s ON it.store_id = s.id
        WHERE it.date_received <= ?
      `;
      const params = [date + ' 23:59:59'];
      if (store_id) {
        sql += ' AND it.store_id = ?';
        params.push(store_id);
      }
      sql += `
        GROUP BY it.store_id, it.product_id
        ORDER BY s.store_name, p.product_name
      `;
      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching inventory as of date:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch inventory as of date' });
    }
  },

  // Record a stock transfer
  recordStockTransfer: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { from_store_id, to_store_id, transfer_date, staff_id, reference, notes, items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'No items provided for transfer' });
      }
      // Check if all products have enough quantity in the source store
      const insufficient = [];
      for (const item of items) {
        const { product_id, quantity } = item;
        const [rows] = await connection.query(
          'SELECT quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
          [from_store_id, product_id]
        );
        const available = rows.length > 0 ? Number(rows[0].quantity) : 0;
        if (available < quantity) {
          insufficient.push({ product_id, requested: quantity, available });
        }
      }
      if (insufficient.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Insufficient quantity for one or more products',
          details: insufficient
        });
      }
      for (const item of items) {
        const { product_id, quantity } = item;
        // Deduct from source store
        await connection.query(
          `UPDATE store_inventory SET quantity = quantity - ? WHERE store_id = ? AND product_id = ?`,
          [quantity, from_store_id, product_id]
        );
        // Add to destination store
        await connection.query(
          `INSERT INTO store_inventory (store_id, product_id, quantity)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [to_store_id, product_id, quantity, quantity]
        );
        // Record in inventory_transfers
        await connection.query(
          `INSERT INTO inventory_transfers
            (from_store_id, to_store_id, product_id, quantity, transfer_date, staff_id, reference, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [from_store_id, to_store_id, product_id, quantity, transfer_date, staff_id, reference, notes]
        );
        // --- Calculate running balance for OUT (source store) ---
        const [lastOut] = await connection.query(
          'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
          [product_id, from_store_id]
        );
        const prevOutBalance = lastOut.length > 0 ? parseFloat(lastOut[0].balance) : 0;
        const newOutBalance = prevOutBalance - quantity;
        // Record in inventory_transactions (out)
        await connection.query(
          `INSERT INTO inventory_transactions
            (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
           VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
          [product_id, reference || 'Stock Transfer', quantity, newOutBalance, transfer_date, from_store_id, staff_id]
        );
        // --- Calculate running balance for IN (destination store) ---
        const [lastIn] = await connection.query(
          'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
          [product_id, to_store_id]
        );
        const prevInBalance = lastIn.length > 0 ? parseFloat(lastIn[0].balance) : 0;
        const newInBalance = prevInBalance + quantity;
        // Record in inventory_transactions (in)
        await connection.query(
          `INSERT INTO inventory_transactions
            (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
          [product_id, reference || 'Stock Transfer', quantity, newInBalance, transfer_date, to_store_id, staff_id]
        );
      }
      await connection.commit();
      res.json({ success: true, message: 'Stock transfer recorded successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error recording stock transfer:', error);
      res.status(500).json({ success: false, error: 'Failed to record stock transfer' });
    } finally {
      connection.release();
    }
  },

  // Get transfer history
  getTransferHistory: async (req, res) => {
    try {
      const { from_store_id, to_store_id, product_id, start_date, end_date } = req.query;
      let sql = `
        SELECT t.*, 
          fs.store_name as from_store_name, 
          ts.store_name as to_store_name, 
          p.product_name, 
          u.full_name as staff_name
        FROM inventory_transfers t
        LEFT JOIN stores fs ON t.from_store_id = fs.id
        LEFT JOIN stores ts ON t.to_store_id = ts.id
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN users u ON t.staff_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (from_store_id) { sql += ' AND t.from_store_id = ?'; params.push(from_store_id); }
      if (to_store_id) { sql += ' AND t.to_store_id = ?'; params.push(to_store_id); }
      if (product_id) { sql += ' AND t.product_id = ?'; params.push(product_id); }
      if (start_date) { sql += ' AND t.transfer_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND t.transfer_date <= ?'; params.push(end_date); }
      sql += ' ORDER BY t.transfer_date DESC, t.id DESC';
      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transfer history' });
    }
  },

  recordStockTake: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { store_id, items, date, staff_id, notes } = req.body;
      if (!store_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing store_id or items' });
      }
      const stockTakeDate = date || new Date().toISOString().split('T')[0];
      // Insert stock_takes event
      const [stockTakeResult] = await connection.query(
        `INSERT INTO stock_takes (store_id, staff_id, take_date, notes) VALUES (?, ?, ?, ?)`,
        [store_id, staff_id, stockTakeDate, notes || null]
      );
      const stock_take_id = stockTakeResult.insertId;
      const adjustments = [];
      for (const item of items) {
        const { product_id, counted_quantity } = item;
        // Get current system quantity
        const [rows] = await connection.query(
          'SELECT quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
          [store_id, product_id]
        );
        const system_quantity = rows.length > 0 ? Number(rows[0].quantity) : 0;
        const diff = counted_quantity - system_quantity;
        // Insert into stock_take_items
        await connection.query(
          `INSERT INTO stock_take_items (stock_take_id, product_id, system_quantity, counted_quantity, difference)
           VALUES (?, ?, ?, ?, ?)`,
          [stock_take_id, product_id, system_quantity, counted_quantity, diff]
        );
        if (diff !== 0) {
          // Get last balance for this product/store
          const [lastTrans] = await connection.query(
            'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
            [product_id, store_id]
          );
          const prevBalance = lastTrans.length > 0 ? parseFloat(lastTrans[0].balance) : system_quantity;
          const newBalance = prevBalance + diff;
          // Insert adjustment transaction
          await connection.query(
            `INSERT INTO inventory_transactions
              (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_id, 'Stock Take Adjustment', diff > 0 ? diff : 0, diff < 0 ? -diff : 0, newBalance, stockTakeDate, store_id, staff_id]
          );
          // Update store_inventory
          await connection.query(
            `UPDATE store_inventory SET quantity = ? WHERE store_id = ? AND product_id = ?`,
            [counted_quantity, store_id, product_id]
          );
          adjustments.push({ product_id, system_quantity, counted_quantity, diff });
        }
      }
      await connection.commit();
      res.json({ success: true, message: 'Stock take recorded', adjustments, stock_take_id });
    } catch (error) {
      await connection.rollback();
      console.error('Error recording stock take:', error);
      res.status(500).json({ success: false, error: 'Failed to record stock take' });
    } finally {
      connection.release();
    }
  },

  getStockTakeHistory: async (req, res) => {
    try {
      const { store_id, staff_id, start_date, end_date, page = 1, limit = 50 } = req.query;
      let sql = `
        SELECT st.*, s.store_name, u.full_name as staff_name
        FROM stock_takes st
        LEFT JOIN stores s ON st.store_id = s.id
        LEFT JOIN users u ON st.staff_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (store_id) { sql += ' AND st.store_id = ?'; params.push(store_id); }
      if (staff_id) { sql += ' AND st.staff_id = ?'; params.push(staff_id); }
      if (start_date) { sql += ' AND st.take_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND st.take_date <= ?'; params.push(end_date); }
      sql += ' ORDER BY st.take_date DESC, st.id DESC';
      // Pagination
      const pageNum = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 50;
      const offset = (pageNum - 1) * pageSize;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, offset);
      // Get total count
      let countSql = 'SELECT COUNT(*) as total FROM stock_takes WHERE 1=1';
      const countParams = [];
      if (store_id) { countSql += ' AND store_id = ?'; countParams.push(store_id); }
      if (staff_id) { countSql += ' AND staff_id = ?'; countParams.push(staff_id); }
      if (start_date) { countSql += ' AND take_date >= ?'; countParams.push(start_date); }
      if (end_date) { countSql += ' AND take_date <= ?'; countParams.push(end_date); }
      const [[countRow]] = await db.query(countSql, countParams);
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / pageSize) || 1;
      // Get paginated data
      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows, pagination: { total, totalPages, page: pageNum, limit: pageSize } });
    } catch (error) {
      console.error('Error fetching stock take history:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stock take history' });
    }
  },

  // Add this: Get stock take items for a given stock_take_id
  getStockTakeItems: async (req, res) => {
    try {
      const { stock_take_id } = req.params;
      if (!stock_take_id) {
        return res.status(400).json({ success: false, error: 'Missing stock_take_id' });
      }
      const [rows] = await db.query(`
        SELECT sti.*, p.product_name
        FROM stock_take_items sti
        LEFT JOIN products p ON sti.product_id = p.id
        WHERE sti.stock_take_id = ?
        ORDER BY p.product_name
      `, [stock_take_id]);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching stock take items:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stock take items' });
    }
  }
};

module.exports = storeController; 