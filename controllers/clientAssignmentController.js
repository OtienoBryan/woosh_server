const db = require('../database/db');

const clientAssignmentController = {
  // Get all client assignments
  getAllClientAssignments: async (req, res) => {
    try {
      const [assignments] = await db.query(`
        SELECT ca.*, 
               c.name as outlet_name, 
               c.contact as outlet_contact,
               c.email as outlet_email,
               sr.name as sales_rep_name,
               sr.email as sales_rep_email,
               sr.phoneNumber as sales_rep_phone
        FROM ClientAssignment ca
        JOIN Clients c ON ca.outletId = c.id
        JOIN SalesRep sr ON ca.salesRepId = sr.id
        WHERE ca.status = 'active' AND sr.status = 1
        ORDER BY ca.assignedAt DESC
      `);
      
      res.json({ success: true, data: assignments });
    } catch (error) {
      console.error('Get client assignments error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch client assignments', error: error.message });
    }
  },

  // Get client assignments by outlet ID
  getClientAssignmentsByOutlet: async (req, res) => {
    try {
      const { outletId } = req.params;
      
      const [assignments] = await db.query(`
        SELECT ca.*, 
               sr.name as sales_rep_name,
               sr.email as sales_rep_email,
               sr.phoneNumber as sales_rep_phone
        FROM ClientAssignment ca
        JOIN SalesRep sr ON ca.salesRepId = sr.id
        WHERE ca.outletId = ? AND ca.status = 'active' AND sr.status = 1
        ORDER BY ca.assignedAt DESC
      `, [outletId]);
      
      res.json({ success: true, data: assignments });
    } catch (error) {
      console.error('Get client assignments by outlet error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch client assignments', error: error.message });
    }
  },

  // Get client assignments by sales rep ID
  getClientAssignmentsBySalesRep: async (req, res) => {
    try {
      const { salesRepId } = req.params;
      
      const [assignments] = await db.query(`
        SELECT ca.*, 
               c.name as outlet_name, 
               c.contact as outlet_contact,
               c.email as outlet_email
        FROM ClientAssignment ca
        JOIN Clients c ON ca.outletId = c.id
        WHERE ca.salesRepId = ? AND ca.status = 'active'
        ORDER BY ca.assignedAt DESC
      `, [salesRepId]);
      
      res.json({ success: true, data: assignments });
    } catch (error) {
      console.error('Get client assignments by sales rep error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch client assignments', error: error.message });
    }
  },

  // Create new client assignment
  createClientAssignment: async (req, res) => {
    try {
      const { outletId, salesRepId } = req.body;
      
      if (!outletId || !salesRepId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Required fields missing: outletId, salesRepId' 
        });
      }
      
      // Check if outlet exists
      const [outlet] = await db.query('SELECT id FROM Clients WHERE id = ?', [outletId]);
      if (outlet.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Outlet not found' 
        });
      }
      
      // Check if sales rep exists and is active
      const [salesRep] = await db.query('SELECT id FROM SalesRep WHERE id = ? AND status = 1', [salesRepId]);
      if (salesRep.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Sales representative not found or inactive' 
        });
      }
      
      // Check if assignment already exists and is active
      const [existing] = await db.query(
        'SELECT id FROM ClientAssignment WHERE outletId = ? AND salesRepId = ? AND status = "active"', 
        [outletId, salesRepId]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Assignment already exists for this outlet and sales rep' 
        });
      }
      
      // Deactivate any existing assignments for this outlet
      await db.query(
        'UPDATE ClientAssignment SET status = "inactive" WHERE outletId = ? AND status = "active"', 
        [outletId]
      );
      
      // Create new assignment
      const [result] = await db.query(`
        INSERT INTO ClientAssignment (outletId, salesRepId, assignedAt, status)
        VALUES (?, ?, NOW(3), 'active')
      `, [outletId, salesRepId]);
      
      // Fetch the created assignment
      const [newAssignment] = await db.query(`
        SELECT ca.*, 
               c.name as outlet_name, 
               sr.name as sales_rep_name
        FROM ClientAssignment ca
        JOIN Clients c ON ca.outletId = c.id
        JOIN SalesRep sr ON ca.salesRepId = sr.id
        WHERE ca.id = ? AND sr.status = 1
      `, [result.insertId]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Client assignment created successfully',
        data: newAssignment[0]
      });
    } catch (error) {
      console.error('Create client assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to create client assignment', error: error.message });
    }
  },

  // Update client assignment status
  updateClientAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Status must be either "active" or "inactive"' 
        });
      }
      
      const [result] = await db.query(
        'UPDATE ClientAssignment SET status = ? WHERE id = ?',
        [status, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Client assignment not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Client assignment updated successfully' 
      });
    } catch (error) {
      console.error('Update client assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to update client assignment', error: error.message });
    }
  },

  // Delete client assignment
  deleteClientAssignment: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query(
        'DELETE FROM ClientAssignment WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Client assignment not found' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Client assignment deleted successfully' 
      });
    } catch (error) {
      console.error('Delete client assignment error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete client assignment', error: error.message });
    }
  }
};

module.exports = clientAssignmentController;
