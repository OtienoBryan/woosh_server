const db = require('../db');

const requestController = {
  getAllRequests: async (req, res) => {
    try {
      const [requests] = await db.query(`
        SELECT r.*, 
               c.name as client_name,
               st.name as service_type_name
        FROM requests r
        LEFT JOIN clients c ON r.client_id = c.id
        LEFT JOIN service_types st ON r.service_type_id = st.id
        ORDER BY r.request_date DESC
      `);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      res.status(500).json({ message: 'Error fetching requests', error: error.message });
    }
  },

  getRequest: async (req, res) => {
    try {
      const [requests] = await db.query(
        'SELECT * FROM requests WHERE id = ?',
        [req.params.id]
      );
      
      if (requests.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      res.json(requests[0]);
    } catch (error) {
      console.error('Error fetching request:', error);
      res.status(500).json({ message: 'Error fetching request', error: error.message });
    }
  },

  createRequest: async (req, res) => {
    const { client_id, service_type_id, request_date, description, status, created_by } = req.body;
    
    try {
      const [result] = await db.query(
        `INSERT INTO requests (client_id, service_type_id, request_date, description, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [client_id, service_type_id, request_date, description, status, created_by]
      );
      
      const [newRequest] = await db.query(
        'SELECT * FROM requests WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(newRequest[0]);
    } catch (error) {
      console.error('Error creating request:', error);
      res.status(500).json({ message: 'Error creating request', error: error.message });
    }
  },

  updateRequest: async (req, res) => {
    const { service_type_id, request_date, description, status } = req.body;
    
    try {
      await db.query(
        `UPDATE requests 
         SET service_type_id = ?, request_date = ?, description = ?, status = ?
         WHERE id = ?`,
        [service_type_id, request_date, description, status, req.params.id]
      );
      
      const [updatedRequest] = await db.query(
        'SELECT * FROM requests WHERE id = ?',
        [req.params.id]
      );
      
      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      res.json(updatedRequest[0]);
    } catch (error) {
      console.error('Error updating request:', error);
      res.status(500).json({ message: 'Error updating request', error: error.message });
    }
  },

  deleteRequest: async (req, res) => {
    try {
      const [result] = await db.query(
        'DELETE FROM requests WHERE id = ?',
        [req.params.id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      res.json({ message: 'Request deleted successfully' });
    } catch (error) {
      console.error('Error deleting request:', error);
      res.status(500).json({ message: 'Error deleting request', error: error.message });
    }
  }
};

module.exports = requestController; 