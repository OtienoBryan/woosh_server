const db = require('../database/db');

const salesRepController = {
  // Get all sales representatives
  getAllSalesReps: async (req, res) => {
    try {
      const { status } = req.query;
      
      let whereClause = '';
      let params = [];
      
      if (status !== undefined) {
        whereClause = 'WHERE s.status = ?';
        params.push(status);
      }
      
      const [reps] = await db.query(`
        SELECT s.id, s.name, s.email, s.phoneNumber as phone, s.status, s.route_id_update, 
               r.name as route_name, s.createdAt as created_at, s.updatedAt as updated_at
        FROM SalesRep s
        LEFT JOIN routes r ON s.route_id_update = r.id
        ${whereClause}
        ORDER BY s.name ASC
      `, params);
      
      res.json({ success: true, data: reps });
    } catch (error) {
      console.error('Get sales reps error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sales representatives', error: error.message });
    }
  },

  // Get sales representative by ID
  getSalesRep: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [reps] = await db.query(`
        SELECT s.id, s.name, s.email, s.phoneNumber as phone, s.status, s.route_id_update, 
               r.name as route_name, s.createdAt as created_at, s.updatedAt as updated_at
        FROM SalesRep s
        LEFT JOIN routes r ON s.route_id_update = r.id
        WHERE s.id = ?
      `, [id]);
      
      if (reps.length === 0) {
        return res.status(404).json({ success: false, message: 'Sales representative not found' });
      }
      
      res.json({ success: true, data: reps[0] });
    } catch (error) {
      console.error('Get sales rep error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch sales representative', error: error.message });
    }
  },

  // Create new sales representative
  createSalesRep: async (req, res) => {
    try {
      const { name, email, phone, status = 1 } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Required fields missing: name, email' 
        });
      }
      
      // Check if email already exists
      const [existing] = await db.query('SELECT id FROM SalesRep WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
      
      const [result] = await db.query(`
        INSERT INTO SalesRep (name, email, phoneNumber, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, [name, email, phone, status]);
      
      // Fetch the created sales rep
      const [newRep] = await db.query(`
        SELECT s.id, s.name, s.email, s.phoneNumber as phone, s.status, s.route_id_update, 
               r.name as route_name, s.createdAt as created_at, s.updatedAt as updated_at
        FROM SalesRep s
        LEFT JOIN routes r ON s.route_id_update = r.id
        WHERE s.id = ?
      `, [result.insertId]);
      
      res.status(201).json({ 
        success: true, 
        message: 'Sales representative created successfully',
        data: newRep[0]
      });
    } catch (error) {
      console.error('Create sales rep error:', error);
      res.status(500).json({ success: false, message: 'Failed to create sales representative', error: error.message });
    }
  },

  // Update sales representative
  updateSalesRep: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, phone, status } = req.body;
      
      // Build dynamic UPDATE query
      const updates = [];
      const values = [];
      
      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (email !== undefined) { updates.push('email = ?'); values.push(email); }
      if (phone !== undefined) { updates.push('phoneNumber = ?'); values.push(phone); }
      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      
      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields provided for update' });
      }
      
      updates.push('updatedAt = NOW()');
      values.push(id);
      
      await db.query(
        `UPDATE SalesRep SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      
      // Fetch the updated sales rep
      const [updatedRep] = await db.query(`
        SELECT s.id, s.name, s.email, s.phoneNumber as phone, s.status, s.route_id_update, 
               r.name as route_name, s.createdAt as created_at, s.updatedAt as updated_at
        FROM SalesRep s
        LEFT JOIN routes r ON s.route_id_update = r.id
        WHERE s.id = ?
      `, [id]);
      
      res.json({ 
        success: true, 
        message: 'Sales representative updated successfully',
        data: updatedRep[0]
      });
    } catch (error) {
      console.error('Update sales rep error:', error);
      res.status(500).json({ success: false, message: 'Failed to update sales representative', error: error.message });
    }
  },

  // Delete sales representative
  deleteSalesRep: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('DELETE FROM SalesRep WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Sales representative not found' });
      }
      
      res.json({ success: true, message: 'Sales representative deleted successfully' });
    } catch (error) {
      console.error('Delete sales rep error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete sales representative', error: error.message });
    }
  }
};

module.exports = salesRepController;
