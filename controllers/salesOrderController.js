const db = require('../database/db');

const salesOrderController = {
  // Get all sales orders
  getAllSalesOrders: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          so.*, 
          c.company_name as customer_name, 
          u.full_name as created_by_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        LEFT JOIN users u ON so.created_by = u.id
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
          c.customer_code,
          c.company_name,
          c.contact_person,
          c.email,
          c.phone,
          c.address,
          c.tax_id,
          c.payment_terms,
          c.credit_limit,
          c.is_active as customer_is_active,
          c.created_at as customer_created_at,
          c.updated_at as customer_updated_at,
          u.full_name as created_by_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
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
        updated_at: salesOrder.customer_updated_at
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
          c.company_name as customer_name
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
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
  }
};

module.exports = salesOrderController; 