const db = require('../database');

const sosController = {
  // Get all SOS alerts
  getSosList: async (req, res) => {
    try {
      console.log('Fetching SOS list...');
      const [sosList] = await db.query(`
        SELECT *
           
        FROM sos s
         
      `);
      console.log('SOS list fetched:', sosList);
      res.json(sosList);
    } catch (error) {
      console.error('Error fetching SOS list:', error);
      res.status(500).json({ message: 'Failed to fetch SOS list' });
    }
  },

  // Get a single SOS alert by ID
  getSos: async (req, res) => {
    try {
      const [sos] = await db.query(
        `SELECT 
          s.*,
          u.name as userName,
          u.phone as userPhone
        FROM sos s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [req.params.id]
      );

      if (sos.length === 0) {
        return res.status(404).json({ message: 'SOS alert not found' });
      }

      res.json(sos[0]);
    } catch (error) {
      console.error('Error fetching SOS alert:', error);
      res.status(500).json({ message: 'Failed to fetch SOS alert' });
    }
  },

  // Create a new SOS alert
  createSos: async (req, res) => {
    const { 
      userId, 
      userName,
      userPhone,
      distressType,
      address,
      longitude,
      latitude,
      status = 'active' 
    } = req.body;

    if (!userId || !userName || !userPhone || !distressType || !address || !longitude || !latitude) {
      return res.status(400).json({ 
        message: 'User ID, name, phone, distress type, address, and location coordinates are required' 
      });
    }

    try {
      // Check if user exists
      const [user] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
      if (user.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Create the SOS alert
      const [result] = await db.query(
        `INSERT INTO sos (
          user_id, 
          user_name,
          user_phone,
          distress_type,
          address,
          longitude,
          latitude,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, userName, userPhone, distressType, address, longitude, latitude, status]
      );

      // Fetch the created SOS alert with related data
      const [newSos] = await db.query(
        `SELECT 
          s.*,
          u.name as userName,
          u.phone as userPhone
        FROM sos s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [result.insertId]
      );

      res.status(201).json(newSos[0]);
    } catch (error) {
      console.error('Error creating SOS alert:', error);
      res.status(500).json({ message: 'Failed to create SOS alert' });
    }
  },

  // Update an SOS alert
  updateSos: async (req, res) => {
    const { 
      status,
      distressType,
      address,
      longitude,
      latitude
    } = req.body;
    const sosId = req.params.id;

    try {
      // Check if SOS alert exists
      const [sos] = await db.query('SELECT id FROM sos WHERE id = ?', [sosId]);
      if (sos.length === 0) {
        return res.status(404).json({ message: 'SOS alert not found' });
      }

      // Update the SOS alert
      const updates = [];
      const values = [];

      if (status) {
        updates.push('status = ?');
        values.push(status);
      }
      if (distressType) {
        updates.push('distress_type = ?');
        values.push(distressType);
      }
      if (address) {
        updates.push('address = ?');
        values.push(address);
      }
      if (longitude) {
        updates.push('longitude = ?');
        values.push(longitude);
      }
      if (latitude) {
        updates.push('latitude = ?');
        values.push(latitude);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No valid updates provided' });
      }

      values.push(sosId);
      await db.query(
        `UPDATE sos SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Fetch the updated SOS alert with related data
      const [updatedSos] = await db.query(
        `SELECT 
          s.*,
          u.name as userName,
          u.phone as userPhone
        FROM sos s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?`,
        [sosId]
      );

      res.json(updatedSos[0]);
    } catch (error) {
      console.error('Error updating SOS alert:', error);
      res.status(500).json({ message: 'Failed to update SOS alert' });
    }
  },

  // Delete an SOS alert
  deleteSos: async (req, res) => {
    try {
      const [result] = await db.query('DELETE FROM sos WHERE id = ?', [req.params.id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'SOS alert not found' });
      }

      res.json({ message: 'SOS alert deleted successfully' });
    } catch (error) {
      console.error('Error deleting SOS alert:', error);
      res.status(500).json({ message: 'Failed to delete SOS alert' });
    }
  }
};

module.exports = sosController; 