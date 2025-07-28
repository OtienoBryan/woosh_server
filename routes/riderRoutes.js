const express = require('express');
const router = express.Router();
const db = require('../database/db'); // Adjust path if needed

// GET /api/riders - fetch all riders
router.get('/', async (req, res) => {
  console.log('GET /api/riders called');
  const sql = 'SELECT id, name, contact, id_number FROM Riders';
  console.log('SQL Query:', sql);
  try {
    const [rows] = await db.query(sql);
    console.log('Riders fetched:', rows.length);
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: 'Failed to fetch riders', details: error.message || error });
  }
});

module.exports = router; 