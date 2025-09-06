const db = require('../database/db');

// Get all routes with pagination and search
exports.getAllRoutes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const country_id = req.query.country_id;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        r.id,
        r.name,
        r.region,
        r.region_name,
        r.country_id,
        r.country_name,
        r.sales_rep_id,
        r.sales_rep_name,
        r.status
      FROM routes r
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM routes r';
    const params = [];
    const countParams = [];

    const whereConditions = [];
    
    if (search) {
      whereConditions.push(`(r.name LIKE ? OR r.region_name LIKE ? OR r.country_name LIKE ? OR r.sales_rep_name LIKE ?)`);
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (country_id) {
      whereConditions.push(`r.country_id = ?`);
      params.push(country_id);
      countParams.push(country_id);
    }
    
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY r.name LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: rows,
      page,
      limit,
      total,
      totalPages
    });
  } catch (err) {
    console.error('Error fetching routes:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch routes', 
      details: err.message 
    });
  }
};

// Get route by ID
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM routes WHERE id = ?', 
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Route not found' 
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error('Error fetching route:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch route', 
      details: err.message 
    });
  }
};

// Create a new route
exports.createRoute = async (req, res) => {
  try {
    const { 
      name, 
      region, 
      region_name, 
      country_id, 
      country_name, 
      sales_rep_id, 
      sales_rep_name, 
      status 
    } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'Route name is required' 
      });
    }

    const [result] = await db.query(
      `INSERT INTO routes (
        name, region, region_name, country_id, country_name, 
        sales_rep_id, sales_rep_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, region, region_name, country_id, country_name, sales_rep_id, sales_rep_name, status || 1]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        region,
        region_name,
        country_id,
        country_name,
        sales_rep_id,
        sales_rep_name,
        status: status || 1
      }
    });
  } catch (err) {
    console.error('Error creating route:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create route', 
      details: err.message 
    });
  }
};

// Update a route
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      region, 
      region_name, 
      country_id, 
      country_name, 
      sales_rep_id, 
      sales_rep_name, 
      status 
    } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'Route name is required' 
      });
    }

    const [result] = await db.query(
      `UPDATE routes SET 
        name = ?, region = ?, region_name = ?, country_id = ?, country_name = ?, 
        sales_rep_id = ?, sales_rep_name = ?, status = ?
      WHERE id = ?`,
      [name, region, region_name, country_id, country_name, sales_rep_id, sales_rep_name, status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Route not found' 
      });
    }

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        name,
        region,
        region_name,
        country_id,
        country_name,
        sales_rep_id,
        sales_rep_name,
        status
      }
    });
  } catch (err) {
    console.error('Error updating route:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update route', 
      details: err.message 
    });
  }
};

// Delete a route
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await db.query('DELETE FROM routes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Route not found' 
      });
    }

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting route:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete route', 
      details: err.message 
    });
  }
};
