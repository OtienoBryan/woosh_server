const connection = require('../database/db');

const storeController = {
  // Get all stores
  getAllStores: async (req, res) => {
    try {
      const [stores] = await connection.query(`
        SELECT * FROM stores 
        ORDER BY store_name ASC
      `);

      res.json({
        success: true,
        data: stores
      });
    } catch (error) {
      console.error('Error fetching stores:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stores'
      });
    }
  },

  // Get store by ID
  getStoreById: async (req, res) => {
    try {
      const { id } = req.params;

      const [stores] = await connection.query(`
        SELECT * FROM stores WHERE id = ?
      `, [id]);

      if (stores.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Store not found'
        });
      }

      res.json({
        success: true,
        data: stores[0]
      });
    } catch (error) {
      console.error('Error fetching store:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch store'
      });
    }
  },

  // Create new store
  createStore: async (req, res) => {
    try {
      const { store_name, store_code, location, address, phone, email } = req.body;

      // Validation
      if (!store_name || !store_code) {
        return res.status(400).json({
          success: false,
          error: 'Store name and code are required'
        });
      }

      // Check if store_code already exists
      const [existingStores] = await connection.query(`
        SELECT id FROM stores WHERE store_code = ?
      `, [store_code]);

      if (existingStores.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Store code already exists'
        });
      }

      // Insert new store
      const [result] = await connection.query(`
        INSERT INTO stores (store_name, store_code, location, address, phone, email)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [store_name, store_code, location, address, phone, email]);

      // Get the created store
      const [createdStores] = await connection.query(`
        SELECT * FROM stores WHERE id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        data: createdStores[0],
        message: 'Store created successfully'
      });
    } catch (error) {
      console.error('Error creating store:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create store'
      });
    }
  },

  // Update store
  updateStore: async (req, res) => {
    try {
      const { id } = req.params;
      const { store_name, store_code, location, address, phone, email } = req.body;

      // Check if store exists
      const [existingStores] = await connection.query(`
        SELECT id FROM stores WHERE id = ?
      `, [id]);

      if (existingStores.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Store not found'
        });
      }

      // Check if store_code already exists (excluding current store)
      if (store_code) {
        const [duplicateStores] = await connection.query(`
          SELECT id FROM stores WHERE store_code = ? AND id != ?
        `, [store_code, id]);

        if (duplicateStores.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Store code already exists'
          });
        }
      }

      // Update store
      await connection.query(`
        UPDATE stores SET
          store_name = ?,
          store_code = ?,
          location = ?,
          address = ?,
          phone = ?,
          email = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [store_name, store_code, location, address, phone, email, id]);

      // Get the updated store
      const [updatedStores] = await connection.query(`
        SELECT * FROM stores WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        data: updatedStores[0],
        message: 'Store updated successfully'
      });
    } catch (error) {
      console.error('Error updating store:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update store'
      });
    }
  },

  // Delete store
  deleteStore: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if store exists
      const [existingStores] = await connection.query(`
        SELECT id FROM stores WHERE id = ?
      `, [id]);

      if (existingStores.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Store not found'
        });
      }

      // Delete store
      await connection.query(`
        DELETE FROM stores WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Store deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting store:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete store'
      });
    }
  },

  // Get store inventory (running balance for a specific store)
  getStoreInventory: async (req, res) => {
    try {
      const { storeId } = req.params;
      
      const [rows] = await connection.query(`
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
      const [rows] = await connection.query(`
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

  // Get in-transit products from sales orders with my_status = 2 (shipped)
  getInTransitProducts: async (req, res) => {
    try {
      const [rows] = await connection.query(`
        SELECT 
          soi.product_id,
          p.product_name,
          p.product_code,
          p.category,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price,
          SUM(soi.quantity) as in_transit_quantity,
          SUM(soi.quantity * p.cost_price) as in_transit_value
        FROM sales_order_items soi
        LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE so.my_status = 2 AND p.is_active = true
        GROUP BY soi.product_id, p.product_name, p.product_code, p.category, p.unit_of_measure, p.cost_price, p.selling_price
        ORDER BY p.product_name
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching in-transit products:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch in-transit products' });
    }
  },

  // Get stock summary for all products across all stores
  getStockSummary: async (req, res) => {
    try {
      // First, get all active stores and products
      const [stores] = await connection.query(`
        SELECT id, store_name, store_code 
        FROM stores 
        WHERE is_active = true 
        ORDER BY store_name
      `);
      
      const [products] = await connection.query(`
        SELECT id, product_name, product_code, category 
        FROM products 
        WHERE is_active = true 
        ORDER BY product_name
      `);
      
      // Get all inventory data
      const [inventory] = await connection.query(`
        SELECT store_id, product_id, quantity 
        FROM store_inventory 
        WHERE store_id IN (${stores.map(s => s.id).join(',')}) 
        AND product_id IN (${products.map(p => p.id).join(',')})
      `);
      
      // Create a map for quick lookup
      const inventoryMap = new Map();
      inventory.forEach(item => {
        const key = `${item.store_id}-${item.product_id}`;
        inventoryMap.set(key, item.quantity);
      });
      
      // Build the response data
      const stockSummary = {
        stores: stores,
        products: products.map(product => {
          const productData = {
            id: product.id,
            product_name: product.product_name,
            product_code: product.product_code,
            category: product.category,
            store_quantities: {}
          };
          
          // Add quantities for each store
          stores.forEach(store => {
            const key = `${store.id}-${product.id}`;
            productData.store_quantities[store.id] = inventoryMap.get(key) || 0;
          });
          
          return productData;
        })
      };
      
      res.json({ success: true, data: stockSummary });
    } catch (error) {
      console.error('Error fetching stock summary:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stock summary' });
    }
  },

  // Get inventory summary by store
  getInventorySummaryByStore: async (req, res) => {
    try {
      const [rows] = await connection.query(`
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
      let sql = 'SELECT it.*, p.product_name, s.store_name, st.name as staff_name FROM inventory_transactions it LEFT JOIN products p ON it.product_id = p.id LEFT JOIN stores s ON it.store_id = s.id LEFT JOIN staff st ON it.staff_id = st.id WHERE 1=1';
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
      const [[countRow]] = await connection.query(countSql, countParams);
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / pageSize) || 1;
      // Get paginated data
      const [rows] = await connection.query(sql, params);
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
      const [rows] = await connection.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching inventory as of date:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch inventory as of date' });
    }
  },

  // Check transfer feasibility without actually performing the transfer
  checkTransferFeasibility: async (req, res) => {
    try {
      const { from_store_id, to_store_id, items } = req.body;
      
      if (!from_store_id || !to_store_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: from_store_id, to_store_id, items'
        });
      }

      // Validate stores exist
      const [stores] = await connection.query(
        'SELECT id, store_name FROM stores WHERE id IN (?, ?)',
        [from_store_id, to_store_id]
      );

      if (stores.length !== 2) {
        return res.status(400).json({
          success: false,
          error: 'One or both stores not found'
        });
      }

      const fromStore = stores.find(s => s.id == from_store_id);
      const toStore = stores.find(s => s.id == to_store_id);

      // Check each item's availability
      const feasibilityResults = [];
      let isFeasible = true;
      let totalRequested = 0;
      let totalAvailable = 0;

      for (const item of items) {
        const { product_id, quantity } = item;
        
        // Get product details and current inventory
        const [rows] = await connection.query(
          `SELECT si.quantity, p.product_name, p.product_code, p.category
           FROM store_inventory si 
           LEFT JOIN products p ON si.product_id = p.id 
           WHERE si.store_id = ? AND si.product_id = ?`,
          [from_store_id, product_id]
        );
        
        const available = rows.length > 0 ? Number(rows[0].quantity) : 0;
        const productName = rows.length > 0 ? rows[0].product_name : `Product ID: ${product_id}`;
        const productCode = rows.length > 0 ? rows[0].product_code : 'N/A';
        const category = rows.length > 0 ? rows[0].category : 'N/A';
        
        const hasSufficientStock = available >= quantity;
        const shortfall = hasSufficientStock ? 0 : quantity - available;
        
        if (!hasSufficientStock) {
          isFeasible = false;
        }

        totalRequested += quantity;
        totalAvailable += Math.min(available, quantity);

        feasibilityResults.push({
          product_id,
          product_name: productName,
          product_code: productCode,
          category,
          requested: quantity,
          available,
          shortfall,
          has_sufficient_stock: hasSufficientStock,
          status: hasSufficientStock ? 'Available' : 'Insufficient'
        });
      }

      // Calculate summary
      const summary = {
        total_products: items.length,
        total_requested: totalRequested,
        total_available: totalAvailable,
        products_with_sufficient_stock: feasibilityResults.filter(item => item.has_sufficient_stock).length,
        products_with_insufficient_stock: feasibilityResults.filter(item => !item.has_sufficient_stock).length,
        overall_feasible: isFeasible
      };

      res.json({
        success: true,
        data: {
          from_store: {
            id: from_store_id,
            name: fromStore.store_name
          },
          to_store: {
            id: to_store_id,
            name: toStore.store_name
          },
          feasibility_results: feasibilityResults,
          summary
        }
      });

    } catch (error) {
      console.error('Error checking transfer feasibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check transfer feasibility'
      });
    }
  },

  // Record a stock transfer
  recordStockTransfer: async (req, res) => {
    let dbConnection;
    try {
      console.log('🚀 Starting stock transfer with data:', JSON.stringify(req.body, null, 2));
      
      dbConnection = await connection.getConnection();
      console.log('✅ Database connection acquired');
      
      await dbConnection.beginTransaction();
      console.log('✅ Transaction started');
      
      const { from_store_id, to_store_id, transfer_date, staff_id, reference, notes, items } = req.body;
      
      // Validate required fields
      if (!from_store_id || !to_store_id || !transfer_date || !staff_id || !items) {
        console.log('❌ Missing required fields:', { from_store_id, to_store_id, transfer_date, staff_id, items: items ? 'present' : 'missing' });
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: from_store_id, to_store_id, transfer_date, staff_id, items' 
        });
      }
      
      if (!Array.isArray(items) || items.length === 0) {
        console.log('❌ No items provided for transfer');
        return res.status(400).json({ success: false, error: 'No items provided for transfer' });
      }
      
      console.log(`📦 Processing ${items.length} items for transfer from store ${from_store_id} to store ${to_store_id}`);
      
      // Check if all products have enough quantity in the source store
      const insufficient = [];
      for (const item of items) {
        const { product_id, quantity } = item;
        console.log(`🔍 Checking availability for product ${product_id}, quantity ${quantity}`);
        
        // Get product details and current inventory
        const [rows] = await dbConnection.query(
          `SELECT si.quantity, p.product_name, p.product_code 
           FROM store_inventory si 
           LEFT JOIN products p ON si.product_id = p.id 
           WHERE si.store_id = ? AND si.product_id = ?`,
          [from_store_id, product_id]
        );
        
        const available = rows.length > 0 ? Number(rows[0].quantity) : 0;
        const productName = rows.length > 0 ? rows[0].product_name : `Product ID: ${product_id}`;
        const productCode = rows.length > 0 ? rows[0].product_code : 'N/A';
        
        console.log(`📊 Product ${product_id} (${productName}): Available ${available}, Requested ${quantity}`);
        
        if (available < quantity) {
          insufficient.push({ 
            product_id, 
            product_name: productName,
            product_code: productCode,
            requested: quantity, 
            available,
            shortfall: quantity - available
          });
          console.log(`❌ Insufficient quantity for product ${product_id} (${productName})`);
        }
      }
      
      if (insufficient.length > 0) {
        console.log('❌ Insufficient quantities found:', insufficient);
        await dbConnection.rollback();
        
        // Create detailed error message
        const errorDetails = insufficient.map(item => 
          `• ${item.product_name} (${item.product_code}): Requested ${item.requested}, Available ${item.available}, Shortfall ${item.shortfall}`
        ).join('\n');
        
        return res.status(400).json({
          success: false,
          error: 'Insufficient quantity for one or more products',
          message: `Cannot complete transfer due to insufficient stock:\n${errorDetails}`,
          details: insufficient,
          summary: {
            total_products_affected: insufficient.length,
            total_shortfall: insufficient.reduce((sum, item) => sum + item.shortfall, 0)
          }
        });
      }
      
      console.log('✅ All products have sufficient quantities');
      
      // Process each item
      for (const item of items) {
        const { product_id, quantity } = item;
        console.log(`🔄 Processing product ${product_id}, quantity ${quantity}`);
        
        // Deduct from source store
        console.log(`📤 Deducting ${quantity} from store ${from_store_id}`);
        await dbConnection.query(
          `UPDATE store_inventory SET quantity = quantity - ? WHERE store_id = ? AND product_id = ?`,
          [quantity, from_store_id, product_id]
        );
        console.log(`✅ Deducted from source store`);
        
        // Add to destination store
        console.log(`📥 Adding ${quantity} to store ${to_store_id}`);
        await dbConnection.query(
          `INSERT INTO store_inventory (store_id, product_id, quantity)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [to_store_id, product_id, quantity, quantity]
        );
        console.log(`✅ Added to destination store`);
        
        // Record in inventory_transfers
        console.log(`📝 Recording transfer in inventory_transfers table`);
        await dbConnection.query(
          `INSERT INTO inventory_transfers
            (from_store_id, to_store_id, product_id, quantity, transfer_date, staff_id, reference, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [from_store_id, to_store_id, product_id, quantity, transfer_date, staff_id, reference, notes]
        );
        console.log(`✅ Transfer recorded in inventory_transfers`);
        
        // --- Calculate running balance for OUT (source store) ---
        console.log(`💾 Calculating running balance for source store ${from_store_id}`);
        const [lastOut] = await dbConnection.query(
          'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
          [product_id, from_store_id]
        );
        const prevOutBalance = lastOut.length > 0 ? parseFloat(lastOut[0].balance) : 0;
        const newOutBalance = prevOutBalance - quantity;
        console.log(`📊 Source store balance: ${prevOutBalance} -> ${newOutBalance}`);
        
        // Record in inventory_transactions (out)
        await dbConnection.query(
          `INSERT INTO inventory_transactions
            (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
           VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
          [product_id, reference || 'Stock Transfer', quantity, newOutBalance, transfer_date, from_store_id, staff_id]
        );
        console.log(`✅ Source store transaction recorded`);
        
        // --- Calculate running balance for IN (destination store) ---
        console.log(`💾 Calculating running balance for destination store ${to_store_id}`);
        const [lastIn] = await dbConnection.query(
          'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
          [product_id, to_store_id]
        );
        const prevInBalance = lastIn.length > 0 ? parseFloat(lastIn[0].balance) : 0;
        const newInBalance = prevInBalance + quantity;
        console.log(`📊 Destination store balance: ${prevInBalance} -> ${newInBalance}`);
        
        // Record in inventory_transactions (in)
        await dbConnection.query(
          `INSERT INTO inventory_transactions
            (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
          [product_id, reference || 'Stock Transfer', quantity, newInBalance, transfer_date, to_store_id, staff_id]
        );
        console.log(`✅ Destination store transaction recorded`);
      }
      
      console.log('💾 Committing transaction...');
      await dbConnection.commit();
      console.log('✅ Stock transfer completed successfully');
      res.json({ success: true, message: 'Stock transfer recorded successfully' });
      
    } catch (error) {
      console.error('❌ Error recording stock transfer:', error);
      console.error('Error stack:', error.stack);
      
      if (dbConnection) {
        try {
          console.log('🔄 Rolling back transaction...');
          await dbConnection.rollback();
          console.log('✅ Transaction rolled back');
        } catch (rollbackError) {
          console.error('❌ Error during rollback:', rollbackError);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Failed to record stock transfer',
        details: error.message 
      });
    } finally {
      if (dbConnection) {
        try {
          console.log('🔌 Releasing database connection...');
          dbConnection.release();
          console.log('✅ Database connection released');
        } catch (releaseError) {
          console.error('❌ Error releasing connection:', releaseError);
        }
      }
    }
  },

  // Get current stock levels for a specific store (useful for checking before transfers)
  getStoreStockLevels: async (req, res) => {
    try {
      const { storeId } = req.params;
      
      if (!storeId) {
        return res.status(400).json({
          success: false,
          error: 'Store ID is required'
        });
      }

      const [rows] = await connection.query(`
        SELECT 
          si.product_id,
          p.product_name,
          p.product_code,
          p.category,
          p.unit_of_measure,
          si.quantity as current_stock,
          p.cost_price,
          p.selling_price,
          (si.quantity * p.cost_price) as stock_value
        FROM store_inventory si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.store_id = ? AND p.is_active = true
        ORDER BY p.product_name
      `, [storeId]);

      // Get store information
      const [storeInfo] = await connection.query(
        'SELECT store_name, store_code, location FROM stores WHERE id = ?',
        [storeId]
      );

      const store = storeInfo[0];
      if (!store) {
        return res.status(404).json({
          success: false,
          error: 'Store not found'
        });
      }

      // Calculate summary statistics
      const summary = {
        total_products: rows.length,
        total_items: rows.reduce((sum, item) => sum + item.current_stock, 0),
        total_value: rows.reduce((sum, item) => sum + (item.stock_value || 0), 0),
        low_stock_items: rows.filter(item => item.current_stock <= 5).length,
        out_of_stock_items: rows.filter(item => item.current_stock === 0).length
      };

      res.json({
        success: true,
        data: {
          store: {
            id: storeId,
            name: store.store_name,
            code: store.store_code,
            location: store.location
          },
          stock_levels: rows,
          summary
        }
      });
    } catch (error) {
      console.error('Error fetching store stock levels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch store stock levels'
      });
    }
  },

  // Get transfer history
  getTransferHistory: async (req, res) => {
    try {
      const { from_store_id, to_store_id, product_id, start_date, end_date, search, page = 1, limit = 20 } = req.query;
      
      // Calculate offset for pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build the base WHERE clause
      let whereClause = 'WHERE 1=1';
      const params = [];
      if (from_store_id) { whereClause += ' AND t.from_store_id = ?'; params.push(from_store_id); }
      if (to_store_id) { whereClause += ' AND t.to_store_id = ?'; params.push(to_store_id); }
      if (product_id) { whereClause += ' AND t.product_id = ?'; params.push(product_id); }
      if (start_date) { whereClause += ' AND t.transfer_date >= ?'; params.push(start_date); }
      if (end_date) { whereClause += ' AND t.transfer_date <= ?'; params.push(end_date); }
      if (search) { 
        whereClause += ` AND (t.reference LIKE ? OR t.notes LIKE ? OR p.product_name LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      // Get total count for pagination
      const countSql = `
        SELECT COUNT(*) as total
        FROM inventory_transfers t
        LEFT JOIN stores fs ON t.from_store_id = fs.id
        LEFT JOIN stores ts ON t.to_store_id = ts.id
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN staff s ON t.staff_id = s.id
        ${whereClause}
      `;
      
      const [countRows] = await connection.query(countSql, params);
      const total = countRows[0].total;
      
      // Build the main query with pagination
      const mainSql = `
        SELECT t.*, 
          fs.store_name as from_store_name, 
          ts.store_name as to_store_name, 
          p.product_name, 
          s.name as staff_name
        FROM inventory_transfers t
        LEFT JOIN stores fs ON t.from_store_id = fs.id
        LEFT JOIN stores ts ON t.to_store_id = ts.id
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN staff s ON t.staff_id = s.id
        ${whereClause}
        ORDER BY t.transfer_date DESC, t.id DESC 
        LIMIT ? OFFSET ?
      `;
      
      // Add pagination parameters
      const mainParams = [...params, parseInt(limit), offset];
      
      const [rows] = await connection.query(mainSql, mainParams);
      
      // Calculate pagination info
      const totalPages = Math.ceil(total / parseInt(limit));
      const currentPage = parseInt(page);
      
      res.json({ 
        success: true, 
        data: rows,
        pagination: {
          page: currentPage,
          limit: parseInt(limit),
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching transfer history:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch transfer history' });
    }
  },

  recordStockTake: async (req, res) => {
    let dbConnection;
    try {
      dbConnection = await connection.getConnection();
      await dbConnection.beginTransaction();
      const { store_id, items, date, staff_id, notes } = req.body;
      if (!store_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing store_id or items' });
      }
      const stockTakeDate = date || new Date().toISOString().split('T')[0];
      // Insert stock_takes event
      const [stockTakeResult] = await dbConnection.query(
        `INSERT INTO stock_takes (store_id, staff_id, take_date, notes) VALUES (?, ?, ?, ?)`,
        [store_id, staff_id, stockTakeDate, notes || null]
      );
      const stock_take_id = stockTakeResult.insertId;
      const adjustments = [];
      for (const item of items) {
        const { product_id, counted_quantity } = item;
        // Get current system quantity
        const [rows] = await dbConnection.query(
          'SELECT quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
          [store_id, product_id]
        );
        const system_quantity = rows.length > 0 ? Number(rows[0].quantity) : 0;
        const diff = counted_quantity - system_quantity;
        // Insert into stock_take_items
        await dbConnection.query(
          `INSERT INTO stock_take_items (stock_take_id, product_id, system_quantity, counted_quantity, difference)
           VALUES (?, ?, ?, ?, ?)`,
          [stock_take_id, product_id, system_quantity, counted_quantity, diff]
        );
        if (diff !== 0) {
          // Get last balance for this product/store
          const [lastTrans] = await dbConnection.query(
            'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
            [product_id, store_id]
          );
          const prevBalance = lastTrans.length > 0 ? parseFloat(lastTrans[0].balance) : system_quantity;
          const newBalance = prevBalance + diff;
          // Insert adjustment transaction
          await dbConnection.query(
            `INSERT INTO inventory_transactions
              (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_id, 'Stock Take Adjustment', diff > 0 ? diff : 0, diff < 0 ? -diff : 0, newBalance, stockTakeDate, store_id, staff_id]
          );
          // Update store_inventory
          await dbConnection.query(
            `UPDATE store_inventory SET quantity = ? WHERE store_id = ? AND product_id = ?`,
            [counted_quantity, store_id, product_id]
          );
          adjustments.push({ product_id, system_quantity, counted_quantity, diff });
        }
      }
      await dbConnection.commit();
      res.json({ success: true, message: 'Stock take recorded', adjustments, stock_take_id });
    } catch (error) {
      if (dbConnection) {
        try {
          await dbConnection.rollback();
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        }
      }
      console.error('Error recording stock take:', error);
      res.status(500).json({ success: false, error: 'Failed to record stock take' });
    } finally {
      if (dbConnection) {
        try {
          dbConnection.release();
        } catch (releaseError) {
          console.error('Error releasing connection:', releaseError);
        }
      }
    }
  },

  getStockTakeHistory: async (req, res) => {
    try {
      const { store_id, staff_id, start_date, end_date, page = 1, limit = 50 } = req.query;
      let sql = `
        SELECT st.*, s.store_name, staff.name as staff_name
        FROM stock_takes st
        LEFT JOIN stores s ON st.store_id = s.id
        LEFT JOIN staff ON st.staff_id = staff.id
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
      const [[countRow]] = await connection.query(countSql, countParams);
      const total = countRow ? countRow.total : 0;
      const totalPages = Math.ceil(total / pageSize) || 1;
      // Get paginated data
      const [rows] = await connection.query(sql, params);
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
      const [rows] = await connection.query(`
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
  },

  // Update stock quantity directly
  updateStockQuantity: async (req, res) => {
    const dbConnection = await connection.getConnection();
    try {
      await dbConnection.beginTransaction();
      const { store_id, product_id, new_quantity, reason, staff_id } = req.body;

      // Validation
      if (!store_id || !product_id || new_quantity === undefined || new_quantity < 0) {
        return res.status(400).json({
          success: false,
          error: 'store_id, product_id, and new_quantity are required. new_quantity must be >= 0'
        });
      }

      // Check if store exists
      const [storeExists] = await dbConnection.query(
        'SELECT id FROM stores WHERE id = ?',
        [store_id]
      );
      if (storeExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Store not found'
        });
      }

      // Check if product exists
      const [productExists] = await dbConnection.query(
        'SELECT id FROM products WHERE id = ?',
        [product_id]
      );
      if (productExists.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Get current quantity
      const [currentInventory] = await dbConnection.query(
        'SELECT quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
        [store_id, product_id]
      );
      const currentQuantity = currentInventory.length > 0 ? Number(currentInventory[0].quantity) : 0;

      // Calculate difference
      const difference = new_quantity - currentQuantity;

      if (difference === 0) {
        return res.status(400).json({
          success: false,
          error: 'New quantity is the same as current quantity'
        });
      }

      // Update store_inventory
      if (currentInventory.length > 0) {
        await dbConnection.query(
          'UPDATE store_inventory SET quantity = ?, updated_at = NOW() WHERE store_id = ? AND product_id = ?',
          [new_quantity, store_id, product_id]
        );
      } else {
        await dbConnection.query(
          'INSERT INTO store_inventory (store_id, product_id, quantity, updated_at) VALUES (?, ?, ?, NOW())',
          [store_id, product_id, new_quantity]
        );
      }

      // Record in inventory_transactions
      const [lastTrans] = await dbConnection.query(
        'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
        [product_id, store_id]
      );
      const prevBalance = lastTrans.length > 0 ? parseFloat(lastTrans[0].balance) : currentQuantity;
      const newBalance = new_quantity;

      await dbConnection.query(
        `INSERT INTO inventory_transactions 
          (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          product_id, 
          reason || 'Manual Stock Update', 
          difference > 0 ? difference : 0, 
          difference < 0 ? -difference : 0, 
          newBalance, 
          store_id, 
          staff_id || 1
        ]
      );

      await dbConnection.commit();

      res.json({
        success: true,
        message: 'Stock quantity updated successfully',
        data: {
          store_id,
          product_id,
          previous_quantity: currentQuantity,
          new_quantity,
          difference
        }
      });
    } catch (error) {
      await dbConnection.rollback();
      console.error('Error updating stock quantity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update stock quantity'
      });
    } finally {
      dbConnection.release();
    }
  },

  // Receive products back to stock from cancelled orders
  receiveToStockFromOrder: async (req, res) => {
    const dbConnection = await connection.getConnection();
    try {
      await dbConnection.beginTransaction();
      
      const { order_id, store_id, notes, items } = req.body;
      
      if (!order_id || !store_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Order ID, store ID, and items are required'
        });
      }

      // Verify the order exists and is cancelled
      const [orderResult] = await dbConnection.query(
        'SELECT id, so_number, my_status FROM sales_orders WHERE id = ?',
        [order_id]
      );

      if (orderResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      if (orderResult[0].my_status !== 4 && orderResult[0].my_status !== 6) { // 4 = Cancelled, 6 = Returned to stock
        return res.status(400).json({
          success: false,
          error: 'Only cancelled orders or orders with returned products can have products returned to stock'
        });
      }

      // Verify store exists
      const [storeResult] = await dbConnection.query(
        'SELECT id, store_name FROM stores WHERE id = ?',
        [store_id]
      );

      if (storeResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Store not found'
        });
      }

      const processedItems = [];
      const errors = [];

      // Process each item
      for (const item of items) {
        try {
          const { product_id, quantity, unit_cost } = item;
          
          if (!product_id || quantity <= 0) {
            errors.push(`Invalid product data: ${JSON.stringify(item)}`);
            continue;
          }

          // Verify product exists
          const [productResult] = await dbConnection.query(
            'SELECT id, product_name, cost_price FROM products WHERE id = ?',
            [product_id]
          );

          if (productResult.length === 0) {
            errors.push(`Product with ID ${product_id} not found`);
            continue;
          }

          const product = productResult[0];
          const actualUnitCost = unit_cost > 0 ? unit_cost : product.cost_price;

          // Check if store_inventory record exists
          const [inventoryResult] = await dbConnection.query(
            'SELECT id, quantity FROM store_inventory WHERE store_id = ? AND product_id = ?',
            [store_id, product_id]
          );

          let newQuantity;
          if (inventoryResult.length > 0) {
            // Update existing inventory
            newQuantity = inventoryResult[0].quantity + quantity;
            await dbConnection.query(
              'UPDATE store_inventory SET quantity = ?, updated_at = NOW() WHERE id = ?',
              [newQuantity, inventoryResult[0].id]
            );
          } else {
            // Create new inventory record
            newQuantity = quantity;
            await dbConnection.query(
              'INSERT INTO store_inventory (store_id, product_id, quantity, updated_at) VALUES (?, ?, ?, NOW())',
              [store_id, product_id, quantity]
            );
          }

          // Record inventory transaction
          const transactionNumber = `RT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Get last balance for this product/store
          const [lastTrans] = await dbConnection.query(
            'SELECT balance FROM inventory_transactions WHERE product_id = ? AND store_id = ? ORDER BY date_received DESC, id DESC LIMIT 1',
            [product_id, store_id]
          );
          const prevBalance = lastTrans.length > 0 ? parseFloat(lastTrans[0].balance) : 0;
          const newBalance = prevBalance + quantity;
          
          await dbConnection.query(
            `INSERT INTO inventory_transactions 
              (product_id, reference, amount_in, amount_out, balance, date_received, store_id, staff_id)
             VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [
              product_id,
              `Return to stock from cancelled order ${orderResult[0].so_number}`,
              quantity, // amount_in
              0, // amount_out
              newBalance,
              store_id,
              req.user?.id || 1
            ]
          );

          // Update product current_stock if needed
          await dbConnection.query(
            'UPDATE products SET current_stock = current_stock + ? WHERE id = ?',
            [quantity, product_id]
          );

          processedItems.push({
            product_id,
            product_name: product.product_name,
            quantity,
            unit_cost: actualUnitCost,
            total_cost: quantity * actualUnitCost,
            new_inventory_quantity: newQuantity
          });

        } catch (itemError) {
          console.error(`Error processing item:`, itemError);
          errors.push(`Failed to process item: ${itemError.message}`);
        }
      }

      if (errors.length > 0 && processedItems.length === 0) {
        // If no items were processed successfully, rollback
        await dbConnection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Failed to process any items',
          details: errors
        });
      }

      // Update order status to indicate products were returned
      await dbConnection.query(
        'UPDATE sales_orders SET my_status = 6, received_by = ?, returned_at = NOW(), notes = CONCAT(COALESCE(notes, ""), " | Products returned to stock on ", NOW()) WHERE id = ?',
        [req.user?.id || 1, order_id]
      );

      await dbConnection.commit();

      res.json({
        success: true,
        message: 'Products successfully received back to stock',
        data: {
          order_id,
          store_id,
          store_name: storeResult[0].store_name,
          processed_items: processedItems,
          received_by: req.user?.id || 1,
          returned_at: new Date(),
          errors: errors.length > 0 ? errors : undefined
        }
      });

    } catch (error) {
      await dbConnection.rollback();
      console.error('Error receiving products to stock:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to receive products to stock'
      });
    } finally {
      dbConnection.release();
    }
  }
};

module.exports = storeController; 