const db = require('../database/db');

const departmentController = {
  getAllDepartments: async (req, res) => {
    try {
      const [departments] = await db.query('SELECT * FROM departments ORDER BY name');
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
    }
  },
  addDepartment: async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required' });
    try {
      const [result] = await db.query('INSERT INTO departments (name) VALUES (?)', [name]);
      res.status(201).json({ id: result.insertId, name });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add department', error: error.message });
    }
  },
  editDepartment: async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required' });
    try {
      await db.query('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
      res.json({ id, name });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update department', error: error.message });
    }
  },
  deactivateDepartment: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('UPDATE departments SET is_active = FALSE WHERE id = ?', [id]);
      res.json({ id, is_active: false });
    } catch (error) {
      res.status(500).json({ message: 'Failed to deactivate department', error: error.message });
    }
  },
};

module.exports = departmentController; 