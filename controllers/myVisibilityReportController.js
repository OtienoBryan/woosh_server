console.log('=== MY VISIBILITY REPORT CONTROLLER IS LOADING ===');

const db = require('../database/db');

// Fetch all my visibility reports (all columns, no joins)
exports.getAllMyVisibilityReports = async (req, res) => {
  console.log('getAllMyVisibilityReports function called');
  try {
    const sql = 'SELECT * FROM VisibilityReport ORDER BY createdAt DESC';
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error in getAllMyVisibilityReports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 