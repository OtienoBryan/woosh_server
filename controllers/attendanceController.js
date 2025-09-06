const db = require('../database/db');

const attendanceController = {
  // Get all attendance records for today
  getTodayAttendance: async (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [rows] = await db.query(
        `SELECT a.*, s.name, s.department FROM attendance a LEFT JOIN staff s ON a.staff_id = s.id WHERE a.date = ?`,
        [today]
      );
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
    }
  },

  // Employee check-in
  checkIn: async (req, res) => {
    const { staff_id } = req.body;
    if (!staff_id) return res.status(400).json({ message: 'Missing staff_id' });
    const today = new Date().toISOString().slice(0, 10);
    try {
      // Prevent double check-in
      const [existing] = await db.query('SELECT * FROM attendance WHERE staff_id = ? AND date = ?', [staff_id, today]);
      if (existing.length > 0 && existing[0].checkin_time) {
        return res.status(400).json({ message: 'Already checked in' });
      }
      const now = new Date();
      if (existing.length > 0) {
        await db.query('UPDATE attendance SET checkin_time = ? WHERE id = ?', [now, existing[0].id]);
      } else {
        await db.query('INSERT INTO attendance (staff_id, checkin_time, date) VALUES (?, ?, ?)', [staff_id, now, today]);
      }
      res.json({ message: 'Checked in' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to check in', error: error.message });
    }
  },

  // Employee check-out
  checkOut: async (req, res) => {
    const { staff_id } = req.body;
    if (!staff_id) return res.status(400).json({ message: 'Missing staff_id' });
    const today = new Date().toISOString().slice(0, 10);
    try {
      const [existing] = await db.query('SELECT * FROM attendance WHERE staff_id = ? AND date = ?', [staff_id, today]);
      if (existing.length === 0 || !existing[0].checkin_time) {
        return res.status(400).json({ message: 'Not checked in yet' });
      }
      if (existing[0].checkout_time) {
        return res.status(400).json({ message: 'Already checked out' });
      }
      const now = new Date();
      await db.query('UPDATE attendance SET checkout_time = ? WHERE id = ?', [now, existing[0].id]);
      res.json({ message: 'Checked out' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to check out', error: error.message });
    }
  },

  // Get all attendance records (for history page)
  getAllAttendance: async (req, res) => {
    try {
      const { date, staff_id, start_date, end_date } = req.query;
      let sql = `SELECT a.*, s.name, s.department, s.role, s.photo_url FROM attendance a LEFT JOIN staff s ON a.staff_id = s.id`;
      const params = [];
      const conditions = [];
      if (date) {
        conditions.push('a.date = ?');
        params.push(date);
      }
      if (start_date && end_date) {
        conditions.push('a.date BETWEEN ? AND ?');
        params.push(start_date, end_date);
      } else if (start_date) {
        conditions.push('a.date >= ?');
        params.push(start_date);
      } else if (end_date) {
        conditions.push('a.date <= ?');
        params.push(end_date);
      }
      if (staff_id) {
        conditions.push('a.staff_id = ?');
        params.push(staff_id);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY a.date DESC, a.checkin_time DESC';
      const [rows] = await db.query(sql, params);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch attendance history', error: error.message });
    }
  },

  // Update attendance record
  updateAttendance: async (req, res) => {
    try {
      const { id } = req.params;
      const { checkin_time, checkout_time, date } = req.body;

      // Validate required fields
      if (!date) {
        return res.status(400).json({ message: 'Date is required' });
      }

      // Check if record exists
      const [existing] = await db.query('SELECT * FROM attendance WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Attendance record not found' });
      }

      // Prepare update data
      const updateData = {
        date: date,
        checkin_time: checkin_time || null,
        checkout_time: checkout_time || null,
        updated_at: new Date()
      };

      // Update the record and mark as corrected
      await db.query(
        'UPDATE attendance SET date = ?, checkin_time = ?, checkout_time = ?, corrected = 1, updated_at = ? WHERE id = ?',
        [updateData.date, updateData.checkin_time, updateData.checkout_time, updateData.updated_at, id]
      );

      // Return updated record
      const [updated] = await db.query(
        'SELECT a.*, s.name, s.department, s.role, s.photo_url FROM attendance a LEFT JOIN staff s ON a.staff_id = s.id WHERE a.id = ?',
        [id]
      );

      res.json(updated[0]);
    } catch (error) {
      console.error('Error updating attendance record:', error);
      res.status(500).json({ message: 'Failed to update attendance record', error: error.message });
    }
  },

  // Create attendance record
  createAttendance: async (req, res) => {
    try {
      const { staff_id, date, checkin_time, checkout_time } = req.body;

      // Validate required fields
      if (!staff_id || !date) {
        return res.status(400).json({ message: 'Staff ID and date are required' });
      }

      // Check if staff exists
      const [staff] = await db.query('SELECT id FROM staff WHERE id = ?', [staff_id]);
      if (staff.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }

      // Check if attendance record already exists for this staff and date
      const [existing] = await db.query(
        'SELECT id FROM attendance WHERE staff_id = ? AND date = ?',
        [staff_id, date]
      );
      if (existing.length > 0) {
        return res.status(400).json({ 
          message: `Attendance record already exists for this staff member on ${new Date(date).toLocaleDateString()}. Please choose a different date or edit the existing record.` 
        });
      }

      // Check monthly limit (max 2 records per month per employee)
      // Count ALL records (both original and corrected) for the limit
      const recordDate = new Date(date);
      const year = recordDate.getFullYear();
      const month = recordDate.getMonth() + 1; // getMonth() returns 0-11, so add 1
      
      const [monthlyRecords] = await db.query(
        'SELECT COUNT(*) as count FROM attendance WHERE staff_id = ? AND YEAR(date) = ? AND MONTH(date) = ?',
        [staff_id, year, month]
      );
      
      if (monthlyRecords[0].count >= 2) {
        const monthName = recordDate.toLocaleString('default', { month: 'long' });
        return res.status(400).json({ 
          message: `Maximum of 2 attendance records per month allowed. This employee already has 2 records for ${monthName} ${year}.` 
        });
      }

      // Create the record (manually created records are marked as corrected)
      const [result] = await db.query(
        'INSERT INTO attendance (staff_id, date, checkin_time, checkout_time, corrected, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [staff_id, date, checkin_time || null, checkout_time || null, 1, new Date(), new Date()]
      );

      // Return created record with staff information
      const [created] = await db.query(
        'SELECT a.*, s.name, s.department, s.role, s.photo_url FROM attendance a LEFT JOIN staff s ON a.staff_id = s.id WHERE a.id = ?',
        [result.insertId]
      );

      res.status(201).json(created[0]);
    } catch (error) {
      console.error('Error creating attendance record:', error);
      res.status(500).json({ message: 'Failed to create attendance record', error: error.message });
    }
  },

  // Get monthly record count for an employee
  getMonthlyRecordCount: async (req, res) => {
    try {
      const { staff_id, year, month } = req.query;

      if (!staff_id || !year || !month) {
        return res.status(400).json({ message: 'Staff ID, year, and month are required' });
      }

      const [result] = await db.query(
        'SELECT COUNT(*) as count FROM attendance WHERE staff_id = ? AND YEAR(date) = ? AND MONTH(date) = ?',
        [staff_id, year, month]
      );

      res.json({ count: result[0].count });
    } catch (error) {
      console.error('Error getting monthly record count:', error);
      res.status(500).json({ message: 'Failed to get monthly record count', error: error.message });
    }
  }
};

module.exports = attendanceController; 