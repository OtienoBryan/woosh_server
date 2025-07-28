const db = require('../database/db');

const calendarTaskController = {
  // Get all tasks for a given month (YYYY-MM)
  getTasks: async (req, res) => {
    try {
      const { month } = req.query; // e.g., '2024-06'
      if (!month) return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
      const [rows] = await db.query(
        'SELECT id, date, title, description, status, assigned_to FROM hr_calendar_tasks WHERE DATE_FORMAT(date, "%Y-%m") = ? ORDER BY date ASC, id ASC',
        [month]
      );
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
  },
  // Add a new task
  addTask: async (req, res) => {
    try {
      const { date, title, description, status, assigned_to } = req.body;
      if (!date || !title) return res.status(400).json({ message: 'Date and title are required' });
      const [result] = await db.query(
        'INSERT INTO hr_calendar_tasks (date, title, description, status, assigned_to) VALUES (?, ?, ?, ?, ?)',
        [date, title, description || '', status || 'Pending', assigned_to || null]
      );
      res.status(201).json({ id: result.insertId, date, title, description, status: status || 'Pending', assigned_to });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add task', error: error.message });
    }
  },
  // Update a task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const { date, title, description, status, assigned_to } = req.body;
      const [result] = await db.query(
        'UPDATE hr_calendar_tasks SET date=?, title=?, description=?, status=?, assigned_to=? WHERE id=?',
        [date, title, description, status, assigned_to, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Task not found' });
      res.json({ id, date, title, description, status, assigned_to });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update task', error: error.message });
    }
  },
  // Delete a task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM hr_calendar_tasks WHERE id = ?', [id]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete task', error: error.message });
    }
  },
};

module.exports = calendarTaskController; 