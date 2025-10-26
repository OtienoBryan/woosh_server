const express = require('express');
const router = express.Router();
const db = require('../database/db'); // Adjust path if needed
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all rider routes
router.use(authenticateToken);

// GET /api/riders - fetch all riders
router.get('/', async (req, res) => {
  console.log('GET /api/riders called');
  const sql = `
    SELECT r.id, r.name, r.contact, r.id_number, r.company_id, rc.name as company_name 
    FROM Riders r 
    LEFT JOIN riders_company rc ON r.company_id = rc.id
  `;
  console.log('SQL Query:', sql);
  try {
    const [rows] = await db.query(sql);
    console.log('Riders fetched:', rows.length);
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: 'Failed to fetch riders', details: error.message || error });
  }
});

// POST /api/riders - create new rider
router.post('/', async (req, res) => {
  console.log('POST /api/riders called', req.body);
  const { name, contact, id_number, company_id } = req.body;
  
  if (!name || !contact || !id_number) {
    return res.status(400).json({ error: 'Name, contact, and ID number are required' });
  }

  try {
    const sql = 'INSERT INTO Riders (name, contact, id_number, company_id) VALUES (?, ?, ?, ?)';
    const [result] = await db.query(sql, [name, contact, id_number, company_id || null]);
    console.log('Rider created with ID:', result.insertId);
    res.status(201).json({ 
      success: true, 
      data: { id: result.insertId, name, contact, id_number, company_id },
      message: 'Rider created successfully' 
    });
  } catch (error) {
    console.error('Error creating rider:', error);
    res.status(500).json({ error: 'Failed to create rider', details: error.message || error });
  }
});

// PUT /api/riders/:id - update rider
router.put('/:id', async (req, res) => {
  console.log('PUT /api/riders/:id called', req.params.id, req.body);
  const { id } = req.params;
  const { name, contact, id_number, company_id } = req.body;
  
  if (!name || !contact || !id_number) {
    return res.status(400).json({ error: 'Name, contact, and ID number are required' });
  }

  try {
    const sql = 'UPDATE Riders SET name = ?, contact = ?, id_number = ?, company_id = ? WHERE id = ?';
    const [result] = await db.query(sql, [name, contact, id_number, company_id || null, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    
    console.log('Rider updated:', id);
    res.json({ 
      success: true, 
      data: { id: parseInt(id), name, contact, id_number, company_id },
      message: 'Rider updated successfully' 
    });
  } catch (error) {
    console.error('Error updating rider:', error);
    res.status(500).json({ error: 'Failed to update rider', details: error.message || error });
  }
});

// DELETE /api/riders/:id - delete rider
router.delete('/:id', async (req, res) => {
  console.log('DELETE /api/riders/:id called', req.params.id);
  const { id } = req.params;

  try {
    const sql = 'DELETE FROM Riders WHERE id = ?';
    const [result] = await db.query(sql, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    
    console.log('Rider deleted:', id);
    res.json({ 
      success: true, 
      message: 'Rider deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting rider:', error);
    res.status(500).json({ error: 'Failed to delete rider', details: error.message || error });
  }
});

// GET /api/riders/companies - fetch all rider companies
router.get('/companies', async (req, res) => {
  console.log('GET /api/riders/companies called');
  const sql = 'SELECT id, name FROM riders_company ORDER BY name';
  console.log('SQL Query:', sql);
  try {
    const [rows] = await db.query(sql);
    console.log('Companies fetched:', rows.length);
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies', details: error.message || error });
  }
});

module.exports = router; 