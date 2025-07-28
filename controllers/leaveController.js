const db = require('../database/db');

exports.getAllSalesRepLeaves = async (req, res) => {
  console.log('GET /api/sales-rep-leaves called');
  const sql = 'SELECT * FROM leaves ORDER BY id DESC';
  console.log('SQL:', sql);
  try {
    const [rows] = await db.query(sql);
    console.log('Rows fetched:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching sales rep leaves:', err);
    res.status(500).json({ error: 'Failed to fetch sales rep leaves', details: err.message });
  }
}; 