const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM JourneyPlan');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch journey plans' });
  }
});

module.exports = router; 