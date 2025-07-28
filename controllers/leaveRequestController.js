const db = require('../database/db');

const leaveRequestController = {
  // Get all leave requests
  getAllLeaveRequests: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT lr.*, s.name AS employee_name
        FROM leave_requests lr
        LEFT JOIN staff s ON lr.employee_id = s.id
        ORDER BY lr.start_date DESC, lr.id DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ message: 'Failed to fetch leave requests', error: error.message });
    }
  },

  // Get all employee leaves (with leave type name)
  getEmployeeLeaves: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT lr.*, s.name AS employee_name, lt.name AS leave_type
        FROM leave_requests lr
        LEFT JOIN staff s ON lr.employee_id = s.id
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        ORDER BY lr.start_date DESC, lr.id DESC
      `);
      console.log(`[getEmployeeLeaves] Returned rows:`, rows.length);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching employee leaves:', error);
      res.status(500).json({ message: 'Failed to fetch employee leaves', error: error.message });
    }
  },

  updateLeaveRequestStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['1', '2', 1, 2].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    try {
      const [result] = await db.query(
        'UPDATE leave_requests SET status = ? WHERE id = ?',
        [status, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating leave request status:', error);
      res.status(500).json({ message: 'Failed to update leave request status', error: error.message });
    }
  },
};

module.exports = leaveRequestController; 