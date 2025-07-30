const db = require('../database/db');

const salesOrderController = {
  // Get all sales orders
  getAllSalesOrders: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          so.*, 
          c.name as customer_name, 
          u.full_name as created_by_name
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN users u ON so.created_by = u.id
        ORDER BY so.created_at DESC
      `);
      
      // Get items for each sales order
      for (let order of rows) {
        const [items] = await db.query(`
          SELECT 
            soi.*, 
            p.product_name, 
            p.product_code, 
            p.unit_of_measure
          FROM sales_order_items soi
          LEFT JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = ?
        `, [order.id]);
        
        // Map product fields into a product object for each item
        order.items = items.map(item => ({
          id: item.id,
          sales_order_id: item.sales_order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          tax_type: item.tax_type,
          tax_amount: parseFloat(item.tax_amount),
          net_price: parseFloat(item.net_price),
          product: {
            id: item.product_id,
            product_name: item.product_name || `Product ${item.product_id}`,
            product_code: item.product_code || 'No Code',
            unit_of_measure: item.unit_of_measure || 'PCS'
          }
        }));
      }
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sales orders' });
    }
  },

  // Get sales order by ID
  getSalesOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      // Get sales order details with all customer fields
      const [salesOrders] = await db.query(`
        SELECT 
          so.*, 
          c.id as client_id,
          c.name,
          c.contact,
          c.email,
          c.address,
          c.tax_pin,
          u.full_name as created_by_name
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN users u ON so.created_by = u.id
        WHERE so.id = ?
      `, [id]);
      if (salesOrders.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      // Get sales order items
      const [items] = await db.query(`
        SELECT 
          soi.*, 
          p.product_name, 
          p.product_code, 
          p.unit_of_measure
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
      `, [id]);
      const salesOrder = salesOrders[0];
      // Map product fields into a product object for each item
      salesOrder.items = items.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        tax_amount: parseFloat(item.tax_amount),
        net_price: parseFloat(item.net_price),
        product: {
          id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          unit_of_measure: item.unit_of_measure
        }
      }));
      // Construct customer object
      salesOrder.customer = {
        id: salesOrder.client_id,
        name: salesOrder.name,
        contact: salesOrder.contact,
        email: salesOrder.email,
        address: salesOrder.address,
        tax_pin: salesOrder.tax_pin
      };
      res.json({ success: true, data: salesOrder });
    } catch (error) {
      console.error('Error fetching sales order:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sales order' });
    }
  },

  // Create new sales order
  createSalesOrder: async (req, res) => {
    const connection = await db.getConnection();
    try {
      console.log('=== CREATE SALES ORDER START ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      await connection.beginTransaction();
      const { customer_id, client_id, order_date, expected_delivery_date, notes, items } = req.body;
      
      // Use either customer_id or client_id (for compatibility)
      const clientId = client_id || customer_id;
      console.log('Client ID:', clientId);
      console.log('Order date:', order_date);
      console.log('Items:', JSON.stringify(items, null, 2));
      
      // Validate that client exists
      console.log('Checking if client exists...');
      const [clientCheck] = await connection.query('SELECT id FROM Clients WHERE id = ?', [clientId]);
      console.log('Client check result:', clientCheck);
      if (clientCheck.length === 0) {
        console.log('Client not found, returning error');
        return res.status(400).json({ 
          success: false, 
          error: `Client with ID ${clientId} not found` 
        });
      }
      console.log('Client validation passed');
      
      // Use client_id directly since sales_orders table uses client_id
      const clientIdToUse = clientId;
      
      // Generate SO number
      const [soCount] = await connection.query('SELECT COUNT(*) as count FROM sales_orders');
      const soNumber = `SO-${String(soCount[0].count + 1).padStart(6, '0')}`;
      console.log('Generated SO number:', soNumber);
      
      // Calculate totals with individual tax rates
      let subtotal = 0;
      let totalTaxAmount = 0;
      
      for (const item of items) {
        const netPrice = item.quantity * item.unit_price;
        let taxRate = 0;
        
        if (item.tax_type === '16%') {
          taxRate = 0.16;
        } else if (item.tax_type === 'zero_rated' || item.tax_type === 'exempted') {
          taxRate = 0;
        }
        
        const itemTaxAmount = netPrice * taxRate;
        subtotal += netPrice;
        totalTaxAmount += itemTaxAmount;
      }
      
      const totalAmount = subtotal + totalTaxAmount;
      console.log('Calculated totals - Net Amount:', subtotal, 'Tax:', totalTaxAmount, 'Total:', totalAmount);
      
      // Create order in sales_orders table
      console.log('Creating order in sales_orders table...');
      const [soResult] = await connection.query(`
        INSERT INTO sales_orders (
          so_number, client_id, order_date, expected_delivery_date, 
          notes, status, total_amount, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
      `, [soNumber, clientIdToUse, order_date, expected_delivery_date, notes, totalAmount, 1]);
      const salesOrderId = soResult.insertId;
      console.log('Order created with ID:', salesOrderId);
      
      // Validate that all products exist
      console.log('Validating products...');
      for (const item of items) {
        console.log('Checking product ID:', item.product_id);
        const [productCheck] = await connection.query('SELECT id FROM products WHERE id = ?', [item.product_id]);
        console.log('Product check result:', productCheck);
        if (productCheck.length === 0) {
          console.log('Product not found, returning error');
          return res.status(400).json({ 
            success: false, 
            error: `Product with ID ${item.product_id} not found` 
          });
        }
      }
      console.log('All products validated');
      
      // Create sales order items
      console.log('Creating sales order items...');
      for (const item of items) {
        console.log('Creating item:', item);
        
        const netPrice = item.quantity * item.unit_price;
        let taxRate = 0;
        
        if (item.tax_type === '16%') {
          taxRate = 0.16;
        } else if (item.tax_type === 'zero_rated' || item.tax_type === 'exempted') {
          taxRate = 0;
        }
        
        const taxAmount = netPrice * taxRate;
        const totalPrice = netPrice + taxAmount;
        
        await connection.query(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, tax_amount, total_price, tax_type, net_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [salesOrderId, item.product_id, item.quantity, item.unit_price, taxAmount, totalPrice, item.tax_type, netPrice]);
      }
      console.log('All items created, committing transaction...');
      await connection.commit();
      console.log('Transaction committed successfully');
      // Get the created order
      const [createdSO] = await db.query(`
        SELECT 
          so.*, 
          c.name as customer_name
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        WHERE so.id = ?
      `, [salesOrderId]);
      res.status(201).json({ 
        success: true, 
        data: createdSO[0],
        message: 'Sales order created successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('=== ERROR CREATING SALES ORDER ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ success: false, error: 'Failed to create sales order' });
    } finally {
      connection.release();
      console.log('=== CREATE SALES ORDER END ===');
    }
  },

  // Update sales order
  updateSalesOrder: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const { customer_id, client_id, order_date, expected_delivery_date, notes, status, items } = req.body;
      
      // Check if sales order exists and get current data
      const [existingSO] = await connection.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      
      // Use provided client_id or customer_id, otherwise keep existing client_id
      const clientId = client_id || customer_id || existingSO[0].client_id;
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * 0.1;
      const totalAmount = subtotal + taxAmount;
      
      // Map numeric status to string status for database
      const statusMap = {
        '0': 'draft',
        '1': 'confirmed',
        '2': 'shipped',
        '3': 'delivered',
        '4': 'in payment',
        '5': 'paid'
      };
      const statusString = statusMap[status] || status || existingSO[0].status;
      
      // Update sales order - preserve existing values if not provided
      await connection.query(`
        UPDATE sales_orders 
        SET client_id = ?, 
            order_date = COALESCE(?, order_date), 
            expected_delivery_date = ?, 
            status = ?,
            total_amount = ?, 
            notes = COALESCE(?, notes),
            updated_at = NOW()
        WHERE id = ?
      `, [clientId, order_date, expected_delivery_date, statusString, totalAmount, notes, id]);
      
      // Delete existing items
      await connection.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [id]);
      
      // Insert new items
      for (const item of items) {
        await connection.query(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?)
        `, [id, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
      await connection.commit();
      console.log('Sales order updated successfully:', id);
      console.log('Status changed to:', statusString, 'my_status set to:', myStatus);
      res.json({ success: true, message: 'Sales order updated successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('=== ERROR UPDATING SALES ORDER ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Request body:', req.body);
      console.error('Sales order ID:', req.params.id);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update sales order',
        details: error.message 
      });
    } finally {
      connection.release();
    }
  },

  // Delete sales order
  deleteSalesOrder: async (req, res) => {
    try {
      const { id } = req.params;
              await db.query('DELETE FROM my_order_items WHERE my_order_id = ?', [id]);
      const [result] = await db.query('DELETE FROM my_order WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      res.json({ success: true, message: 'Sales order deleted successfully' });
    } catch (error) {
      console.error('Error deleting sales order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete sales order' });
    }
  },

  // Assign a rider to a sales order
  assignRider: async (req, res) => {
    try {
      const { id } = req.params;
      const { riderId } = req.body;
      if (!riderId) {
        return res.status(400).json({ success: false, error: 'riderId is required' });
      }
      // Check if sales order exists
      const [existingSO] = await db.query('SELECT id FROM my_order WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      // Update the sales order with the rider ID, set my_status to 2, and assigned_at to now
      const now = new Date();
              await db.query('UPDATE my_order SET rider_id = ?, my_status = 2, assigned_at = ? WHERE id = ?', [riderId, now, id]);
      res.json({ success: true, message: 'Rider assigned successfully' });
    } catch (error) {
      console.error('Error assigning rider:', error);
      res.status(500).json({ success: false, error: 'Failed to assign rider' });
    }
  },

  getSalesOrderItems: async (req, res) => {
    try {
      const { id } = req.params;
      const [items] = await db.query(`
        SELECT 
          soi.*, 
          p.product_name, 
          p.product_code, 
          p.unit_of_measure
        FROM my_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.my_order_id = ?
      `, [id]);
      // Map product fields into a product object for each item
      const mappedItems = items.map(item => ({
        ...item,
        product: {
          id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          unit_of_measure: item.unit_of_measure
        }
      }));
      res.json({ success: true, data: mappedItems });
    } catch (error) {
      console.error('Error fetching sales order items:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sales order items' });
    }
  },

  // Receive items back to stock for a cancelled sales order
  receiveBackToStock: async (req, res) => {
    const { id } = req.params;
    try {
      // Check if the order exists and is cancelled
      const [orders] = await db.query('SELECT * FROM my_order WHERE id = ?', [id]);
      if (!orders.length) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      const order = orders[0];
      if (order.my_status !== 4) {
        return res.status(400).json({ success: false, error: 'Order is not cancelled' });
      }
      // Get all items in the order
      const [items] = await db.query('SELECT product_id, quantity FROM my_order_items WHERE my_order_id = ?', [id]);
      if (!items.length) {
        return res.status(400).json({ success: false, error: 'No items found for this order' });
      }
      // Update product stock for each item
      for (const item of items) {
        await db.query('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      // Optionally, log the action or mark the order as returned
              await db.query('UPDATE my_order SET returned_to_stock = 1 WHERE id = ?', [id]);
      res.json({ success: true, message: 'Items received back to stock.' });
    } catch (error) {
      console.error('Error receiving items back to stock:', error);
      res.status(500).json({ success: false, error: 'Failed to receive items back to stock' });
    }
  },

  // Convert order to invoice and copy to sales_orders table
  convertToInvoice: async (req, res) => {
    try {
      const { id } = req.params;
      const invoiceData = req.body;
      
      console.log('=== CONVERTING ORDER TO INVOICE ===');
      console.log('Order ID:', id);
      console.log('Invoice data:', JSON.stringify(invoiceData, null, 2));
      
      // Start transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // Get the original order from sales_orders table
        const [orders] = await connection.query(`
          SELECT * FROM sales_orders WHERE id = ?
        `, [id]);
        
        if (orders.length === 0) {
          await connection.rollback();
          return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const originalOrder = orders[0];
        
        console.log('Original order:', JSON.stringify(originalOrder, null, 2));
        
        // Update the order status to confirmed (invoice status)
        await connection.query(`
          UPDATE sales_orders 
          SET status = ?, updated_at = NOW()
          WHERE id = ?
        `, ['confirmed', id]);
        
        console.log('=== CONVERSION SUCCESSFUL ===');
        console.log('Order ID:', id);
        console.log('Status updated to: confirmed');
        
        // Commit transaction
        await connection.commit();
        
        console.log('=== CONVERSION SUCCESSFUL ===');
        console.log('New invoice ID:', salesOrderId);
        console.log('Invoice number:', invoiceNumber);
        
        res.json({ 
          success: true, 
          message: 'Order successfully converted to invoice',
          orderId: id,
          status: 'confirmed'
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('Error converting order to invoice:', error);
      res.status(500).json({ success: false, error: 'Failed to convert order to invoice' });
    }
  }
};

module.exports = salesOrderController; 