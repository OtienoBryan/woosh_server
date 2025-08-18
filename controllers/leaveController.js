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

exports.updateLeaveStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  console.log(`PATCH /api/sales-rep-leaves/${id}/status called with status:`, status);
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  
  // Convert numeric status to string values that match the database
  let statusValue;
  if (status === 0 || status === '0') {
    statusValue = 'PENDING';
  } else if (status === 1 || status === '1') {
    statusValue = '1'; // Approved
  } else if (status === 3 || status === '3') {
    statusValue = '3'; // Declined
  } else {
    console.log('Invalid status value:', status);
    return res.status(400).json({ error: 'Invalid status value. Must be 0 (pending), 1 (approved), or 3 (declined)' });
  }
  
  console.log('Converted status value:', statusValue);
  
  try {
    // First check if the leave exists
    const [checkResult] = await db.query('SELECT * FROM leaves WHERE id = ?', [id]);
    console.log('Leave found:', checkResult.length > 0);
    if (checkResult.length > 0) {
      console.log('Current leave data:', checkResult[0]);
    }
    
    const [result] = await db.query(
      'UPDATE leaves SET status = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [statusValue, id]
    );
    
    console.log('Update result:', result);
    console.log('Affected rows:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      console.log('No rows were updated');
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    console.log(`Leave ${id} status updated to ${statusValue}`);
    res.json({ success: true, message: 'Leave status updated successfully' });
  } catch (err) {
    console.error('Error updating leave status:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ error: 'Failed to update leave status', details: err.message });
  }
}; 