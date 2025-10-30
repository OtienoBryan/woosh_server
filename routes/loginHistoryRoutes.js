const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all login history routes
router.use(authenticateToken);

router.get('/', async (req, res) => {
  console.log('[loginHistoryRoutes] GET /api/login-history endpoint hit');
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);
  try {
    const { startDate, endDate } = req.query;
    let sql = 'SELECT id, userId, sessionStart, sessionEnd FROM LoginHistory';
    const params = [];
    if (startDate && endDate) {
      sql += ' WHERE DATE(sessionStart) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ' WHERE DATE(sessionStart) >= ?';
      params.push(startDate);
    } else if (endDate) {
      sql += ' WHERE DATE(sessionStart) <= ?';
      params.push(endDate);
    }
    sql += ' ORDER BY sessionStart DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/login-history:', err);
    res.status(500).json({ error: 'Failed to fetch login history', details: err.message });
  }
});

module.exports = router; 