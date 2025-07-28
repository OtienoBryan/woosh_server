const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', async (req, res) => {
  console.log('[loginHistoryRoutes] GET /api/login-history endpoint hit');
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  try {
    const [rows] = await db.query('SELECT id, userId, sessionStart, sessionEnd FROM LoginHistory');
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/login-history:', err);
    res.status(500).json({ error: 'Failed to fetch login history', details: err.message });
  }
});

module.exports = router; 