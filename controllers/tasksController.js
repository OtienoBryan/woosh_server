const db = require('../database/db');

const tasksController = {
  // Get all tasks for a given month (YYYY-MM)
  getTasks: async (req, res) => {
    try {
      const { month } = req.query; // e.g., '2024-06'
      if (!month) return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
      const [rows] = await db.query(
        'SELECT id, title, description, status, isCompleted, priority, salesRepId, date, createdAt FROM tasks WHERE DATE_FORMAT(createdAt, "%Y-%m") = ? ORDER BY createdAt ASC, id ASC',
        [month]
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
  },

  // Get all tasks (without month filter)
  getAllTasks: async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT id, title, description, status, isCompleted, priority, salesRepId, date, createdAt FROM tasks ORDER BY createdAt ASC, id ASC'
      );
      res.json(rows);
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
  },

  // Add a new task
  addTask: async (req, res) => {
    try {
      const { title, description, date, status, priority, salesRepId, isCompleted } = req.body;
      if (!title) return res.status(400).json({ message: 'Title is required' });
      const [result] = await db.query(
        'INSERT INTO tasks (title, description, date, status, priority, salesRepId, isCompleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, description || '', date || '', status || 'pending', priority || 'medium', salesRepId || 1, isCompleted || false]
      );
      res.status(201).json({ 
        id: result.insertId, 
        title, 
        description, 
        date, 
        status: status || 'pending', 
        priority: priority || 'medium',
        salesRepId: salesRepId || 1,
        isCompleted: isCompleted || false
      });
    } catch (error) {
      console.error('Error adding task:', error);
      res.status(500).json({ message: 'Failed to add task', error: error.message });
    }
  },

  // Update a task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, date, status, priority, salesRepId, isCompleted } = req.body;
      const [result] = await db.query(
        'UPDATE tasks SET title=?, description=?, date=?, status=?, priority=?, salesRepId=?, isCompleted=? WHERE id=?',
        [title, description, date, status, priority, salesRepId, isCompleted, id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Task not found' });
      res.json({ 
        id, 
        title, 
        description, 
        date, 
        status, 
        priority,
        salesRepId,
        isCompleted
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task', error: error.message });
    }
  },

  // Delete a task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM tasks WHERE id = ?', [id]);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Failed to delete task', error: error.message });
    }
  },
};

module.exports = tasksController;
