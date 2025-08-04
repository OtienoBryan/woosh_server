const db = require('../database/db');

const deliveryNoteController = {
  // Get all delivery notes
  getAllDeliveryNotes: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          dn.*, 
          c.name as customer_name,
          u.full_name as created_by_name,
          r.name as rider_name,
          r.contact as rider_contact,
          so.so_number as sales_order_number
        FROM delivery_notes dn
        LEFT JOIN Clients c ON dn.customer_id = c.id
        LEFT JOIN users u ON dn.created_by = u.id
        LEFT JOIN Riders r ON dn.rider_id = r.id
        LEFT JOIN sales_orders so ON dn.sales_order_id = so.id
        ORDER BY dn.created_at DESC
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching delivery notes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch delivery notes' });
    }
  },

  // Get delivery note by ID
  getDeliveryNoteById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(`
        SELECT 
          dn.*, 
          c.name as customer_name,
          u.full_name as created_by_name,
          r.name as rider_name,
          r.contact as rider_contact,
          so.so_number as sales_order_number
        FROM delivery_notes dn
        LEFT JOIN Clients c ON dn.customer_id = c.id
        LEFT JOIN users u ON dn.created_by = u.id
        LEFT JOIN Riders r ON dn.rider_id = r.id
        LEFT JOIN sales_orders so ON dn.sales_order_id = so.id
        WHERE dn.id = ?
      `, [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Delivery note not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch delivery note' });
    }
  },

  // Create delivery note
  createDeliveryNote: async (req, res) => {
    try {
      const { sales_order_id, delivery_date, notes, items } = req.body;
      
      // Get sales order details
      const [salesOrder] = await db.query('SELECT * FROM sales_orders WHERE id = ?', [sales_order_id]);
      if (salesOrder.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      
      const so = salesOrder[0];
      
      // Generate delivery note number
      const [lastDN] = await db.query('SELECT dn_number FROM delivery_notes ORDER BY id DESC LIMIT 1');
      const dnNumber = lastDN.length > 0 ? 
        `DN${String(parseInt(lastDN[0].dn_number.replace('DN', '')) + 1).padStart(6, '0')}` : 
        'DN000001';
      
      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Insert delivery note
      const [result] = await db.query(`
        INSERT INTO delivery_notes (
          dn_number, sales_order_id, customer_id, delivery_date, 
          status, my_status, total_amount, notes, created_by
        ) VALUES (?, ?, ?, ?, 'draft', 0, ?, ?, ?)
      `, [dnNumber, sales_order_id, so.client_id, delivery_date, totalAmount, notes, req.user.id]);
      
      const deliveryNoteId = result.insertId;
      
      // Insert delivery note items
      for (const item of items) {
        await db.query(`
          INSERT INTO delivery_note_items (
            delivery_note_id, product_id, quantity, unit_price, 
            total_price, delivered_quantity
          ) VALUES (?, ?, ?, ?, ?, 0)
        `, [deliveryNoteId, item.product_id, item.quantity, item.unit_price, 
            item.quantity * item.unit_price]);
      }
      
      res.json({ success: true, data: { id: deliveryNoteId, dn_number: dnNumber } });
    } catch (error) {
      console.error('Error creating delivery note:', error);
      res.status(500).json({ success: false, error: 'Failed to create delivery note' });
    }
  },

  // Update delivery note
  updateDeliveryNote: async (req, res) => {
    try {
      const { id } = req.params;
      const { delivery_date, notes, status } = req.body;
      
      await db.query(`
        UPDATE delivery_notes 
        SET delivery_date = ?, notes = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `, [delivery_date, notes, status, id]);
      
      res.json({ success: true, message: 'Delivery note updated successfully' });
    } catch (error) {
      console.error('Error updating delivery note:', error);
      res.status(500).json({ success: false, error: 'Failed to update delivery note' });
    }
  },

  // Delete delivery note
  deleteDeliveryNote: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete delivery note items first
      await db.query('DELETE FROM delivery_note_items WHERE delivery_note_id = ?', [id]);
      
      // Delete delivery note
      await db.query('DELETE FROM delivery_notes WHERE id = ?', [id]);
      
      res.json({ success: true, message: 'Delivery note deleted successfully' });
    } catch (error) {
      console.error('Error deleting delivery note:', error);
      res.status(500).json({ success: false, error: 'Failed to delete delivery note' });
    }
  },

  // Update delivery note status
  updateDeliveryNoteStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      let myStatus = 0;
      switch (status) {
        case 'draft': myStatus = 0; break;
        case 'prepared': myStatus = 1; break;
        case 'in_transit': myStatus = 2; break;
        case 'delivered': myStatus = 3; break;
        case 'cancelled': myStatus = 4; break;
        default: myStatus = 0;
      }
      
      await db.query(`
        UPDATE delivery_notes 
        SET status = ?, my_status = ?, updated_at = NOW()
        WHERE id = ?
      `, [status, myStatus, id]);
      
      res.json({ success: true, message: 'Delivery note status updated successfully' });
    } catch (error) {
      console.error('Error updating delivery note status:', error);
      res.status(500).json({ success: false, error: 'Failed to update delivery note status' });
    }
  },

  // Assign rider to delivery note
  assignRider: async (req, res) => {
    try {
      const { id } = req.params;
      const { rider_id } = req.body;
      
      await db.query(`
        UPDATE delivery_notes 
        SET rider_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [rider_id, id]);
      
      res.json({ success: true, message: 'Rider assigned successfully' });
    } catch (error) {
      console.error('Error assigning rider:', error);
      res.status(500).json({ success: false, error: 'Failed to assign rider' });
    }
  },

  // Mark delivery note as delivered
  markAsDelivered: async (req, res) => {
    try {
      const { id } = req.params;
      
      await db.query(`
        UPDATE delivery_notes 
        SET status = 'delivered', my_status = 3, delivered_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [id]);
      
      res.json({ success: true, message: 'Delivery note marked as delivered' });
    } catch (error) {
      console.error('Error marking as delivered:', error);
      res.status(500).json({ success: false, error: 'Failed to mark as delivered' });
    }
  },

  // Get delivery note items
  getDeliveryNoteItems: async (req, res) => {
    try {
      const { deliveryNoteId } = req.params;
      
      const [rows] = await db.query(`
        SELECT 
          dni.*, 
          p.product_name, 
          p.product_code, 
          p.unit_of_measure
        FROM delivery_note_items dni
        LEFT JOIN products p ON dni.product_id = p.id
        WHERE dni.delivery_note_id = ?
      `, [deliveryNoteId]);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching delivery note items:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch delivery note items' });
    }
  },

  // Create delivery note item
  createDeliveryNoteItem: async (req, res) => {
    try {
      const { deliveryNoteId } = req.params;
      const { product_id, quantity, unit_price } = req.body;
      
      const [result] = await db.query(`
        INSERT INTO delivery_note_items (
          delivery_note_id, product_id, quantity, unit_price, 
          total_price, delivered_quantity
        ) VALUES (?, ?, ?, ?, ?, 0)
      `, [deliveryNoteId, product_id, quantity, unit_price, quantity * unit_price]);
      
      res.json({ success: true, data: { id: result.insertId } });
    } catch (error) {
      console.error('Error creating delivery note item:', error);
      res.status(500).json({ success: false, error: 'Failed to create delivery note item' });
    }
  },

  // Update delivery note item
  updateDeliveryNoteItem: async (req, res) => {
    try {
      const { deliveryNoteId, itemId } = req.params;
      const { quantity, unit_price, delivered_quantity } = req.body;
      
      await db.query(`
        UPDATE delivery_note_items 
        SET quantity = ?, unit_price = ?, total_price = ?, 
            delivered_quantity = ?, updated_at = NOW()
        WHERE id = ? AND delivery_note_id = ?
      `, [quantity, unit_price, quantity * unit_price, delivered_quantity, itemId, deliveryNoteId]);
      
      res.json({ success: true, message: 'Delivery note item updated successfully' });
    } catch (error) {
      console.error('Error updating delivery note item:', error);
      res.status(500).json({ success: false, error: 'Failed to update delivery note item' });
    }
  },

  // Delete delivery note item
  deleteDeliveryNoteItem: async (req, res) => {
    try {
      const { deliveryNoteId, itemId } = req.params;
      
      await db.query(`
        DELETE FROM delivery_note_items 
        WHERE id = ? AND delivery_note_id = ?
      `, [itemId, deliveryNoteId]);
      
      res.json({ success: true, message: 'Delivery note item deleted successfully' });
    } catch (error) {
      console.error('Error deleting delivery note item:', error);
      res.status(500).json({ success: false, error: 'Failed to delete delivery note item' });
    }
  }
};

module.exports = deliveryNoteController; 