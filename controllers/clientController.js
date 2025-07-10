const db = require('../database/db');

const clientController = {
  // Get all premises
  getAllClients: async (req, res) => {
    try {
      console.log('Attempting to fetch all premises...');
      
      // Test database connection
      try {
        const [test] = await db.query('SELECT 1');
        console.log('Database connection test successful:', test);
      } catch (dbError) {
        console.error('Database connection test failed:', dbError);
        throw new Error(`Database connection failed: ${dbError.message}`);
      }

      // Check if premises table exists
      try {
        const [tables] = await db.query('SHOW TABLES LIKE "premises"');
        console.log('Tables check result:', tables);
        if (tables.length === 0) {
          throw new Error('Premises table does not exist');
        }
      } catch (tableError) {
        console.error('Table check failed:', tableError);
        throw new Error(`Table check failed: ${tableError.message}`);
      }

      // Fetch all premises
      try {
        const [premises] = await db.query('SELECT id, name, address, latitude, longitude, createdAt, updatedAt FROM premises ORDER BY createdAt DESC');
        console.log('Premises fetched successfully:', premises);
        res.json(premises);
      } catch (queryError) {
        console.error('Query execution failed:', queryError);
        throw new Error(`Query execution failed: ${queryError.message}`);
      }
    } catch (error) {
      console.error('Error in getAllClients:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ 
        message: 'Failed to fetch premises',
        error: error.message,
        details: {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage
        }
      });
    }
  },

  getClient: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Fetching premise with ID:', id);
      
      const [premises] = await db.query(
        'SELECT id, name, address, latitude, longitude, createdAt, updatedAt FROM premises WHERE id = ?',
        [id]
      );

      if (premises.length === 0) {
        console.log('Premise not found');
        return res.status(404).json({ message: 'Premise not found' });
      }

      console.log('Premise found:', premises[0]);
      res.json(premises[0]);
    } catch (error) {
      console.error('Error in getClient:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      });
      res.status(500).json({ 
        message: 'Failed to fetch premise',
        error: error.message 
      });
    }
  },

  // Create a new premise
  createClient: async (req, res) => {
    try {
      const { name, address, latitude, longitude } = req.body;
      console.log('Creating premise with data:', req.body);

      // Validate required fields
      if (!name || !address) {
        return res.status(400).json({ 
          message: 'Name and address are required' 
        });
      }

      // Insert new premise
      const [result] = await db.query(
        'INSERT INTO premises (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
        [name, address, latitude || null, longitude || null]
      );

      // Fetch the newly created premise
      const [newPremise] = await db.query(
        'SELECT id, name, address, latitude, longitude, createdAt, updatedAt FROM premises WHERE id = ?',
        [result.insertId]
      );

      console.log('Premise created successfully:', newPremise[0]);
      res.status(201).json(newPremise[0]);
    } catch (error) {
      console.error('Error in createClient:', error);
      res.status(500).json({ 
        message: 'Failed to create premise',
        error: error.message 
      });
    }
  },

  updateClient: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, latitude, longitude } = req.body;
      console.log('Updating premise with ID:', id, 'Data:', req.body);

      // Validate required fields
      if (!name || !address) {
        return res.status(400).json({ 
          message: 'Name and address are required' 
        });
      }

      // Update premise
      await db.query(
        'UPDATE premises SET name = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?',
        [name, address, latitude || null, longitude || null, id]
      );

      // Fetch the updated premise
      const [updatedPremise] = await db.query(
        'SELECT id, name, address, latitude, longitude, createdAt, updatedAt FROM premises WHERE id = ?',
        [id]
      );

      if (updatedPremise.length === 0) {
        return res.status(404).json({ message: 'Premise not found' });
      }

      console.log('Premise updated successfully:', updatedPremise[0]);
      res.json(updatedPremise[0]);
    } catch (error) {
      console.error('Error in updateClient:', error);
      res.status(500).json({ 
        message: 'Failed to update premise',
        error: error.message 
      });
    }
  },

  deleteClient: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Deleting premise with ID:', id);

      // Check if premise exists
      const [premise] = await db.query(
        'SELECT * FROM premises WHERE id = ?',
        [id]
      );

      if (premise.length === 0) {
        return res.status(404).json({ message: 'Premise not found' });
      }

      // Delete premise
      await db.query('DELETE FROM premises WHERE id = ?', [id]);
      console.log('Premise deleted successfully');
      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteClient:', error);
      res.status(500).json({ 
        message: 'Failed to delete premise',
        error: error.message 
      });
    }
  }
};

module.exports = clientController; 