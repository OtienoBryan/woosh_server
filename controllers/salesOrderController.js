const db = require('../database/db');

const salesOrderController = {
  // Get all sales orders
  getAllSalesOrders: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          so.*, 
          c.name as customer_name, 
          c.countryId,
          co.name as country_name,
          c.region_id,
          r.name as region_name,
          u.full_name as created_by_name,
          rider.name as rider_name,
          rider.contact as rider_contact
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN Country co ON c.countryId = co.id
        LEFT JOIN Regions r ON c.region_id = r.id
        LEFT JOIN users u ON so.created_by = u.id
        LEFT JOIN Riders rider ON so.rider_id = rider.id
        ORDER BY so.created_at DESC
      `);
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
          c.id as customer_id,
          c.address,
          c.name,
          c.countryId,
          co.name as country_name,
          c.region_id,
          r.name as region_name,
          c.contact,
          c.email,
          c.contact,
          c.address,
          c.tax_pin,
          c.status as customer_is_active,
          c.created_at as customer_created_at,
           
          u.full_name as created_by_name
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN Country co ON c.countryId = co.id
        LEFT JOIN Regions r ON c.region_id = r.id
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
        product: {
          id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          unit_of_measure: item.unit_of_measure
        }
      }));
      // Construct customer object
      salesOrder.customer = {
        id: salesOrder.customer_id,
        customer_code: salesOrder.customer_code,
        company_name: salesOrder.company_name,
        contact_person: salesOrder.contact_person,
        email: salesOrder.email,
        phone: salesOrder.phone,
        address: salesOrder.address,
        tax_id: salesOrder.tax_id,
        payment_terms: salesOrder.payment_terms,
        credit_limit: salesOrder.credit_limit,
        is_active: salesOrder.customer_is_active,
        created_at: salesOrder.customer_created_at,
        updated_at: salesOrder.customer_updated_at,
        name: salesOrder.name, // Add name from Clients table
        tax_pin: salesOrder.tax_pin // Add tax_pin from Clients table
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
      await connection.beginTransaction();
      const { customer_id, order_date, expected_delivery_date, notes, items } = req.body;
      // Generate SO number
      const [soCount] = await connection.query('SELECT COUNT(*) as count FROM sales_orders');
      const soNumber = `SO-${String(soCount[0].count + 1).padStart(6, '0')}`;
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * 0.1; // 10% tax
      const totalAmount = subtotal + taxAmount;
      // Create sales order
      const [soResult] = await connection.query(`
        INSERT INTO sales_orders (
          so_number, customer_id, order_date, expected_delivery_date, 
          subtotal, tax_amount, total_amount, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [soNumber, customer_id, order_date, expected_delivery_date, subtotal, taxAmount, totalAmount, notes, 1]);
      const salesOrderId = soResult.insertId;
      // Create sales order items
      for (const item of items) {
        await connection.query(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?)
        `, [salesOrderId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
      await connection.commit();
      // Get the created sales order
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
      console.error('Error creating sales order:', error);
      res.status(500).json({ success: false, error: 'Failed to create sales order' });
    } finally {
      connection.release();
    }
  },

  // Update sales order
  updateSalesOrder: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const { customer_id, order_date, expected_delivery_date, notes, items } = req.body;
      // Check if sales order exists
      const [existingSO] = await connection.query('SELECT id FROM sales_orders WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * 0.1;
      const totalAmount = subtotal + taxAmount;
      // Update sales order
      await connection.query(`
        UPDATE sales_orders 
        SET customer_id = ?, order_date = ?, expected_delivery_date = ?, 
            subtotal = ?, tax_amount = ?, total_amount = ?, notes = ?
        WHERE id = ?
      `, [customer_id, order_date, expected_delivery_date, subtotal, taxAmount, totalAmount, notes, id]);
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
      res.json({ success: true, message: 'Sales order updated successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating sales order:', error);
      res.status(500).json({ success: false, error: 'Failed to update sales order' });
    } finally {
      connection.release();
    }
  },

  // Delete sales order
  deleteSalesOrder: async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [id]);
      const [result] = await db.query('DELETE FROM sales_orders WHERE id = ?', [id]);
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
      const [existingSO] = await db.query('SELECT id FROM sales_orders WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      // Update the sales order with the rider ID, set my_status to 2, and assigned_at to now
      const now = new Date();
      await db.query('UPDATE sales_orders SET rider_id = ?, my_status = 2, assigned_at = ? WHERE id = ?', [riderId, now, id]);
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
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
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
      const [orders] = await db.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
      if (!orders.length) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      const order = orders[0];
      if (order.my_status !== 4) {
        return res.status(400).json({ success: false, error: 'Order is not cancelled' });
      }
      // Get all items in the order
      const [items] = await db.query('SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?', [id]);
      if (!items.length) {
        return res.status(400).json({ success: false, error: 'No items found for this order' });
      }
      // Update product stock for each item
      for (const item of items) {
        await db.query('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      // Optionally, log the action or mark the order as returned
      await db.query('UPDATE sales_orders SET returned_to_stock = 1 WHERE id = ?', [id]);
      res.json({ success: true, message: 'Items received back to stock.' });
    } catch (error) {
      console.error('Error receiving items back to stock:', error);
      res.status(500).json({ success: false, error: 'Failed to receive items back to stock' });
    }
  }
};

module.exports = salesOrderController; 