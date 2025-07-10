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
      let sql = `SELECT a.*, s.name, s.department FROM attendance a LEFT JOIN staff s ON a.staff_id = s.id`;
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
  }
};

module.exports = attendanceController; 