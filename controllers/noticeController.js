const db = require('../database/db');

exports.getAllNotices = async (req, res) => {
  try {
    let sql = 'SELECT * FROM notices';
    const params = [];
    const filters = [];
    if (req.query.country_id) {
      filters.push('country_id = ?');
      params.push(req.query.country_id);
    }
    if (req.query.status !== undefined) {
      filters.push('status = ?');
      params.push(req.query.status);
    } else {
      filters.push('status = 0');
    }
    if (filters.length) {
      sql += ' WHERE ' + filters.join(' AND ');
    }
    sql += ' ORDER BY id DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
};

exports.getNoticeById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notices WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Notice not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notice' });
  }
};

exports.createNotice = async (req, res) => {
  const { title, content, country_id, status } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  try {
    const [result] = await db.query('INSERT INTO notices (title, content, country_id, status) VALUES (?, ?, ?, ?)', [title, content, country_id || null, status !== undefined ? status : 0]);
    res.status(201).json({ id: result.insertId, title, content, country_id, status: status !== undefined ? status : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create notice' });
  }
};

exports.updateNotice = async (req, res) => {
  const { title, content, country_id, status } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });
  try {
    const [result] = await db.query('UPDATE notices SET title = ?, content = ?, country_id = ?, status = ? WHERE id = ?', [title, content, country_id || null, status !== undefined ? status : 0, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notice not found' });
    res.json({ id: req.params.id, title, content, country_id, status: status !== undefined ? status : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notice' });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM notices WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notice not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete notice' });
  }
};

exports.archiveNotice = async (req, res) => {
  try {
    const [result] = await db.query('UPDATE notices SET status = 1 WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notice not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive notice' });
  }
};

exports.deleteAllNotices = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM notices');
    res.json({ success: true, deleted: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete all notices' });
  }
};

exports.getCountries = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Country ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
}; 