const db = require('../database/db');

const publicHolidaysController = {
  // Get all public holidays
  getAllHolidays: async (req, res) => {
    try {
      const { country, year } = req.query;
      let query = 'SELECT id, name, date, country, is_recurring FROM public_holidays WHERE 1=1';
      const params = [];
      
      if (country) {
        query += ' AND country = ?';
        params.push(country);
      }
      
      if (year) {
        query += ' AND YEAR(date) = ?';
        params.push(year);
      }
      
      query += ' ORDER BY date ASC';
      
      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching public holidays:', error);
      res.status(500).json({ message: 'Failed to fetch public holidays', error: error.message });
    }
  },

  // Get holidays for a specific month
  getHolidaysByMonth: async (req, res) => {
    try {
      const { month } = req.query; // YYYY-MM format
      if (!month) {
        return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
      }
      
      const [rows] = await db.query(
        `SELECT id, name, date, country, is_recurring 
         FROM public_holidays 
         WHERE DATE_FORMAT(date, "%Y-%m") = ? 
         ORDER BY date ASC`,
        [month]
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching holidays by month:', error);
      res.status(500).json({ message: 'Failed to fetch holidays', error: error.message });
    }
  },

  // Add a new public holiday
  addHoliday: async (req, res) => {
    try {
      const { name, date, country, is_recurring } = req.body;
      
      if (!name || !date) {
        return res.status(400).json({ message: 'Name and date are required' });
      }
      
      // Check if holiday already exists for this date and country
      const [existing] = await db.query(
        'SELECT id FROM public_holidays WHERE date = ? AND country = ? AND name = ?',
        [date, country || 'Kenya', name]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Holiday already exists for this date and country' });
      }
      
      const [result] = await db.query(
        'INSERT INTO public_holidays (name, date, country, is_recurring) VALUES (?, ?, ?, ?)',
        [name, date, country || 'Kenya', is_recurring || false]
      );
      
      res.status(201).json({
        id: result.insertId,
        name,
        date,
        country: country || 'Kenya',
        is_recurring: is_recurring || false
      });
    } catch (error) {
      console.error('Error adding public holiday:', error);
      res.status(500).json({ message: 'Failed to add public holiday', error: error.message });
    }
  },

  // Update a public holiday
  updateHoliday: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, date, country, is_recurring } = req.body;
      
      if (!name || !date) {
        return res.status(400).json({ message: 'Name and date are required' });
      }
      
      const [result] = await db.query(
        'UPDATE public_holidays SET name = ?, date = ?, country = ?, is_recurring = ? WHERE id = ?',
        [name, date, country || 'Kenya', is_recurring || false, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
      
      res.json({
        id: parseInt(id),
        name,
        date,
        country: country || 'Kenya',
        is_recurring: is_recurring || false
      });
    } catch (error) {
      console.error('Error updating public holiday:', error);
      res.status(500).json({ message: 'Failed to update public holiday', error: error.message });
    }
  },

  // Delete a public holiday
  deleteHoliday: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('DELETE FROM public_holidays WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Holiday not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting public holiday:', error);
      res.status(500).json({ message: 'Failed to delete public holiday', error: error.message });
    }
  },
};

module.exports = publicHolidaysController;

