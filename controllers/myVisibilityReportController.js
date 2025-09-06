console.log('=== MY VISIBILITY REPORT CONTROLLER IS LOADING ===');

const db = require('../config/database');

// Fetch all my visibility reports with client outlet names
exports.getAllMyVisibilityReports = async (req, res) => {
  console.log('getAllMyVisibilityReports function called');
  try {
    const sql = `
      SELECT 
        vr.*,
        c.name as outletName,
        c.name as companyName,
        co.name as country,
        sr.name as salesRep
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep sr ON vr.userId = sr.id
      ORDER BY vr.createdAt DESC
    `;
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error in getAllMyVisibilityReports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 