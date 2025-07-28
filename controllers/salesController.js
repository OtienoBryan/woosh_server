const db = require('../database/db');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const upload = multer({ dest: 'uploads/' });

// Get all countries
exports.getAllCountries = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Country ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch countries', details: err.message });
  }
};

// Get all regions (optionally by country_id)
exports.getAllRegions = async (req, res) => {
  try {
    let query = 'SELECT * FROM Regions';
    const params = [];
    if (req.query.country_id) {
      query += ' WHERE countryId = ?';
      params.push(req.query.country_id);
    }
    query += ' ORDER BY name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch regions', details: err.message });
  }
};

// Get all routes
exports.getAllRoutes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM routes ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routes', details: err.message });
  }
};

// Get all sales reps
exports.getAllSalesReps = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM SalesRep ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales reps', details: err.message });
  }
};

// Create a new sales rep
exports.createSalesRep = async (req, res) => {
  const { name, email, phoneNumber, country, region, route, photo } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO SalesRep (name, email, phone, country, region, route_name_update, photoUrl) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phoneNumber, country, region, route, photo]
    );
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      email, 
      phoneNumber, 
      country, 
      region, 
      route, 
      photo 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sales rep', details: err.message });
  }
};

// Update a sales rep
exports.updateSalesRep = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, country, region, route_name_update, photoUrl } = req.body;
  console.log('Update Sales Rep called');
  console.log('Params id:', id);
  console.log('Body:', req.body);
  try {
    console.log('SQL params:', [name, email, phone, country, region, route_name_update, photoUrl, id]);
    await db.query(
      'UPDATE SalesRep SET name = ?, email = ?, phoneNumber = ?, country = ?, region = ?, route_name_update = ?, photoUrl = ? WHERE id = ?',
      [name, email, phone, country, region, route_name_update, photoUrl, id]
    );
    res.json({ 
      id, 
      name, 
      email, 
      phone, 
      country, 
      region, 
      route_name_update, 
      photoUrl 
    });
  } catch (err) {
    console.error('Error updating sales rep:', err);
    res.status(500).json({ error: 'Failed to update sales rep', details: err.message });
  }
};

// Update status of a sales rep
exports.updateSalesRepStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (typeof status !== 'number') {
    return res.status(400).json({ error: 'Status must be a number (0 or 1)' });
  }
  try {
    await db.query('UPDATE SalesRep SET status = ? WHERE id = ?', [status, id]);
    const [rows] = await db.query('SELECT * FROM SalesRep WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sales rep status', details: err.message });
  }
};

// Delete a sales rep
exports.deleteSalesRep = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM SalesRep WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete sales rep', details: err.message });
  }
}; 

// Upload sales rep photo to Cloudinary
exports.uploadSalesRepPhoto = [
  upload.single('photo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sales_reps',
        resource_type: 'image',
      });
      res.json({ url: result.secure_url });
    } catch (err) {
      console.error('Cloudinary upload error:', err); // <-- Add this line
      res.status(500).json({ error: 'Failed to upload photo', details: err.message });
    }
  }
]; 

// Get all managers assigned to a sales rep
exports.getSalesRepManagers = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  try {
    const [rows] = await db.query(
      `SELECT srm.id, srm.manager_id, srm.manager_type, m.name, m.email, m.phoneNumber, m.country, m.region
       FROM sales_rep_managers srm
       JOIN managers m ON srm.manager_id = m.id
       WHERE srm.sales_rep_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assigned managers', details: err.message });
  }
};

// Assign managers to a sales rep (replace all assignments)
exports.assignManagersToSalesRep = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  const { assignments } = req.body; // [{ manager_id, manager_type }]
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: 'Assignments must be an array' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM sales_rep_managers WHERE sales_rep_id = ?', [id]);
    for (const a of assignments) {
      await conn.query(
        'INSERT INTO sales_rep_managers (sales_rep_id, manager_id, manager_type) VALUES (?, ?, ?)',
        [id, a.manager_id, a.manager_type]
      );
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to assign managers', details: err.message });
  } finally {
    conn.release();
  }
};

// Unassign a manager from a sales rep
exports.unassignManagerFromSalesRep = async (req, res) => {
  const { id, managerId } = req.params;
  try {
    await db.query('DELETE FROM sales_rep_managers WHERE sales_rep_id = ? AND manager_id = ?', [id, managerId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unassign manager', details: err.message });
  }
}; 

// Get a single sales rep by ID
exports.getSalesRepById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM SalesRep WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales rep', details: err.message });
  }
}; 

// Get key account targets for a sales rep (ordered by month)
exports.getKeyAccountTargets = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  try {
    const [rows] = await db.query('SELECT * FROM key_account_targets WHERE sales_rep_id = ? ORDER BY target_month DESC, created_at DESC', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch key account targets', details: err.message });
  }
};

// Add key account targets for a sales rep
exports.addKeyAccountTargets = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  const { vapes_targets, pouches_targets, new_outlets_targets, target_month } = req.body;
  if (!target_month) return res.status(400).json({ error: 'target_month is required' });
  try {
    // Prevent duplicate month
    const [existing] = await db.query('SELECT id FROM key_account_targets WHERE sales_rep_id = ? AND target_month = ?', [id, target_month]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Target for this month already exists' });
    }
    const [result] = await db.query(
      'INSERT INTO key_account_targets (sales_rep_id, vapes_targets, pouches_targets, new_outlets_targets, target_month) VALUES (?, ?, ?, ?, ?)',
      [id, vapes_targets, pouches_targets, new_outlets_targets, target_month]
    );
    res.status(201).json({ id: result.insertId, sales_rep_id: id, vapes_targets, pouches_targets, new_outlets_targets, target_month });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add key account targets', details: err.message });
  }
}; 

// Update key account target
exports.updateKeyAccountTarget = async (req, res) => {
  const { targetId } = req.params;
  const { vapes_targets, pouches_targets, new_outlets_targets, target_month } = req.body;
  if (!target_month) return res.status(400).json({ error: 'target_month is required' });
  try {
    await db.query(
      'UPDATE key_account_targets SET vapes_targets = ?, pouches_targets = ?, new_outlets_targets = ?, target_month = ? WHERE id = ?',
      [vapes_targets, pouches_targets, new_outlets_targets, target_month, targetId]
    );
    res.json({ id: targetId, vapes_targets, pouches_targets, new_outlets_targets, target_month });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update key account target', details: err.message });
  }
};

// Delete key account target
exports.deleteKeyAccountTarget = async (req, res) => {
  const { targetId } = req.params;
  try {
    await db.query('DELETE FROM key_account_targets WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete key account target', details: err.message });
  }
}; 

// Get retail targets for a sales rep (ordered by month)
exports.getRetailTargets = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  try {
    const [rows] = await db.query('SELECT * FROM retail_targets WHERE sales_rep_id = ? ORDER BY target_month DESC, created_at DESC', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch retail targets', details: err.message });
  }
};

// Add retail targets for a sales rep
exports.addRetailTargets = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  const { vapes_targets, pouches_targets, new_outlets_targets, target_month } = req.body;
  if (!target_month) return res.status(400).json({ error: 'target_month is required' });
  try {
    // Prevent duplicate month
    const [existing] = await db.query('SELECT id FROM retail_targets WHERE sales_rep_id = ? AND target_month = ?', [id, target_month]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Target for this month already exists' });
    }
    const [result] = await db.query(
      'INSERT INTO retail_targets (sales_rep_id, vapes_targets, pouches_targets, new_outlets_targets, target_month) VALUES (?, ?, ?, ?, ?)',
      [id, vapes_targets, pouches_targets, new_outlets_targets, target_month]
    );
    res.status(201).json({ id: result.insertId, sales_rep_id: id, vapes_targets, pouches_targets, new_outlets_targets, target_month });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add retail targets', details: err.message });
  }
};

// Update retail target
exports.updateRetailTarget = async (req, res) => {
  const { targetId } = req.params;
  const { vapes_targets, pouches_targets, new_outlets_targets, target_month } = req.body;
  if (!target_month) return res.status(400).json({ error: 'target_month is required' });
  try {
    await db.query(
      'UPDATE retail_targets SET vapes_targets = ?, pouches_targets = ?, new_outlets_targets = ?, target_month = ? WHERE id = ?',
      [vapes_targets, pouches_targets, new_outlets_targets, target_month, targetId]
    );
    res.json({ id: targetId, vapes_targets, pouches_targets, new_outlets_targets, target_month });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update retail target', details: err.message });
  }
};

// Delete retail target
exports.deleteRetailTarget = async (req, res) => {
  const { targetId } = req.params;
  try {
    await db.query('DELETE FROM retail_targets WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete retail target', details: err.message });
  }
}; 

// Get distributors targets for a sales rep (ordered by month)
exports.getDistributorsTargets = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  try {
    const [rows] = await db.query('SELECT * FROM distributors_targets WHERE sales_rep_id = ? ORDER BY target_month DESC, created_at DESC', [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch distributors targets', details: err.message });
  }
};

// Add distributors targets for a sales rep
exports.addDistributorsTargets = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  const { vapes_targets, pouches_targets, new_outlets_targets, target_month } = req.body;
  if (!target_month) return res.status(400).json({ error: 'target_month is required' });
  try {
    // Prevent duplicate month
    const [existing] = await db.query('SELECT id FROM distributors_targets WHERE sales_rep_id = ? AND target_month = ?', [id, target_month]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Target for this month already exists' });
    }
    const [result] = await db.query(
      'INSERT INTO distributors_targets (sales_rep_id, vapes_targets, pouches_targets, new_outlets_targets, target_month) VALUES (?, ?, ?, ?, ?)',
      [id, vapes_targets, pouches_targets, new_outlets_targets, target_month]
    );
    res.status(201).json({ id: result.insertId, sales_rep_id: id, vapes_targets, pouches_targets, new_outlets_targets, target_month });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add distributors targets', details: err.message });
  }
};

// Update distributors target
exports.updateDistributorsTarget = async (req, res) => {
  const { targetId } = req.params;
  const { vapes_targets, pouches_targets, new_outlets_targets, target_month } = req.body;
  if (!target_month) return res.status(400).json({ error: 'target_month is required' });
  try {
    await db.query(
      'UPDATE distributors_targets SET vapes_targets = ?, pouches_targets = ?, new_outlets_targets = ?, target_month = ? WHERE id = ?',
      [vapes_targets, pouches_targets, new_outlets_targets, target_month, targetId]
    );
    res.json({ id: targetId, vapes_targets, pouches_targets, new_outlets_targets, target_month });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update distributors target', details: err.message });
  }
};

// Delete distributors target
exports.deleteDistributorsTarget = async (req, res) => {
  const { targetId } = req.params;
  try {
    await db.query('DELETE FROM distributors_targets WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete distributors target', details: err.message });
  }
}; 

// Get manager assignments (one per type) for a sales rep
exports.getManagerAssignments = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  try {
    const [rows] = await db.query(
      `SELECT srm.manager_type, srm.manager_id, m.name, m.email, m.phoneNumber
       FROM sales_rep_manager_assignments srm
       JOIN managers m ON srm.manager_id = m.id
       WHERE srm.sales_rep_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch manager assignments', details: err.message });
  }
};

// Set manager assignments for a sales rep (one per type)
exports.setManagerAssignments = async (req, res) => {
  const { id } = req.params; // sales_rep_id
  const { assignments } = req.body; // [{ manager_type, manager_id }]
  if (!Array.isArray(assignments)) {
    return res.status(400).json({ error: 'Assignments must be an array' });
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM sales_rep_manager_assignments WHERE sales_rep_id = ?', [id]);
    for (const a of assignments) {
      if (a.manager_id && a.manager_type) {
        await conn.query(
          'INSERT INTO sales_rep_manager_assignments (sales_rep_id, manager_id, manager_type) VALUES (?, ?, ?)',
          [id, a.manager_id, a.manager_type]
        );
      }
    }
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Failed to set manager assignments', details: err.message });
  } finally {
    conn.release();
  }
}; 

// Add a new country
exports.addCountry = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Country name is required' });
  try {
    const [result] = await db.query('INSERT INTO countries (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add country', details: err.message });
  }
};

// Add a new region
exports.addRegion = async (req, res) => {
  const { name, country_id } = req.body;
  if (!name || !country_id) return res.status(400).json({ error: 'Region name and country_id are required' });
  try {
    const [result] = await db.query('INSERT INTO regions (name, country_id) VALUES (?, ?)', [name, country_id]);
    res.status(201).json({ id: result.insertId, name, country_id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add region', details: err.message });
  }
};

// Add a new route
exports.addRoute = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Route name is required' });
  try {
    const [result] = await db.query('INSERT INTO routes (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add route', details: err.message });
  }
}; 

// Get sales rep performance (targets vs sales by client type)
exports.getSalesRepPerformance = async (req, res) => {
  try {
    console.log('[getSalesRepPerformance] Starting...');
    const { start_date, end_date } = req.query;
    console.log('[getSalesRepPerformance] Query params:', { start_date, end_date });

    // Check if required tables exist
    const [tables] = await db.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('SalesRep', 'distributors_targets', 'key_account_targets', 'retail_targets', 'Clients', 'sales_orders', 'sales_order_items', 'products')
    `);
    
    const existingTables = tables.map(t => t.TABLE_NAME);
    const requiredTables = ['SalesRep', 'distributors_targets', 'key_account_targets', 'retail_targets', 'Clients', 'sales_orders', 'sales_order_items', 'products'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('[getSalesRepPerformance] Missing tables:', missingTables);
      return res.status(400).json({ 
        success: false, 
        error: `Missing required tables: ${missingTables.join(', ')}. Please run the database setup script.` 
      });
    }

    // 1. Get all sales reps (include route_id_update, route name, and region)
    console.log('[getSalesRepPerformance] Querying SalesRep table...');
    const [salesReps] = await db.query(`
      SELECT s.id, s.name, s.route_id_update, r.name AS route_name, s.region, rg.name AS region_name, s.country
      FROM SalesRep s
      LEFT JOIN routes r ON s.route_id_update = r.id
      LEFT JOIN Regions rg ON s.region = rg.id OR s.region = rg.name
    `);
    console.log('[getSalesRepPerformance] SalesReps found:', salesReps.length);

    // 2. Get all targets for each type, filtered by date range if provided
    function filterTargets(targets) {
      if (!start_date && !end_date) return targets;
      return targets.filter(t => {
        const tStart = t.start_date ? new Date(t.start_date) : null;
        const tEnd = t.end_date ? new Date(t.end_date) : null;
        const sDate = start_date ? new Date(start_date) : null;
        const eDate = end_date ? new Date(end_date) : null;
        // Overlap logic: target is valid if its range overlaps with filter range
        if (tStart && eDate && tStart > eDate) return false;
        if (tEnd && sDate && tEnd < sDate) return false;
        return true;
      });
    }
    
    console.log('[getSalesRepPerformance] Querying targets tables...');
    const [distributorTargetsRaw] = await db.query('SELECT * FROM distributors_targets');
    const [keyAccountTargetsRaw] = await db.query('SELECT * FROM key_account_targets');
    const [retailTargetsRaw] = await db.query('SELECT * FROM retail_targets');
    console.log('[getSalesRepPerformance] Targets found:', {
      distributors: distributorTargetsRaw.length,
      keyAccounts: keyAccountTargetsRaw.length,
      retail: retailTargetsRaw.length
    });
    
    const distributorTargets = filterTargets(distributorTargetsRaw);
    const keyAccountTargets = filterTargets(keyAccountTargetsRaw);
    const retailTargets = filterTargets(retailTargetsRaw);

    // 3. Get all clients with their type and route_id_update
    console.log('[getSalesRepPerformance] Querying Clients table...');
    const [clients] = await db.query('SELECT id, client_type, route_id_update FROM Clients');
    console.log('[getSalesRepPerformance] Clients found:', clients.length);

    // 4. Get all sales_order_items joined with sales_orders, client, products, and Category, filtered by order_date
    console.log('[getSalesRepPerformance] Querying sales data...');
    let salesQuery = `
      SELECT soi.*, so.client_id, so.order_date, c.client_type, c.route_id_update, p.category_id
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.sales_order_id = so.id
      JOIN Clients c ON so.client_id = c.id
      JOIN products p ON soi.product_id = p.id
    `;
    const salesParams = [];
    if (start_date && end_date) {
      salesQuery += ' WHERE so.order_date BETWEEN ? AND ?';
      salesParams.push(start_date, end_date);
    } else if (start_date) {
      salesQuery += ' WHERE so.order_date >= ?';
      salesParams.push(start_date);
    } else if (end_date) {
      salesQuery += ' WHERE so.order_date <= ?';
      salesParams.push(end_date);
    }
    const [sales] = await db.query(salesQuery, salesParams);
    console.log('[getSalesRepPerformance] Sales records found:', sales.length);

    // 5. Aggregate data (same as before)
    console.log('[getSalesRepPerformance] Processing performance data...');
    const performance = salesReps.map(rep => {
      // Find all clients for this rep by route_id_update
      const repClients = clients.filter(c => c.route_id_update === rep.route_id_update);
      const repClientIds = repClients.map(c => c.id);

      // For each client type, get targets, sales, and outlet stats
      function getTypeStats(clientType, targetObj, salesArr) {
        const typeClients = repClients.filter(c => c.client_type === clientType);
        const typeClientIds = typeClients.map(c => c.id);
        const total_outlets = typeClientIds.length;
        const outlets_with_orders = typeClientIds.filter(cid => salesArr.some(s => s.client_id === cid)).length;
        return {
          vapes_target: targetObj.vapes_targets || 0,
          pouches_target: targetObj.pouches_targets || 0,
          vapes_sales: salesArr.filter(s => typeClientIds.includes(s.client_id) && (s.category_id === 1 || s.category_id === 3)).reduce((sum, s) => sum + (s.quantity || 0), 0),
          pouches_sales: salesArr.filter(s => typeClientIds.includes(s.client_id) && (s.category_id === 4 || s.category_id === 5)).reduce((sum, s) => sum + (s.quantity || 0), 0),
          total_outlets,
          outlets_with_orders,
          outlet_pct: total_outlets > 0 ? (outlets_with_orders / total_outlets) * 100 : 0
        };
      }

      function pickTarget(targets, repId) {
        const filtered = targets.filter(t => t.sales_rep_id === repId);
        if (filtered.length === 0) return {};
        return filtered.reduce((latest, t) => {
          if (!latest.start_date) return t;
          if (t.start_date && new Date(t.start_date) > new Date(latest.start_date)) return t;
          return latest;
        }, filtered[0]);
      }

      const distTarget = pickTarget(distributorTargets, rep.id);
      const keyTarget = pickTarget(keyAccountTargets, rep.id);
      const retailTarget = pickTarget(retailTargets, rep.id);

      return {
        id: rep.id,
        name: rep.name,
        route_name: rep.route_name,
        region: rep.region_name || rep.region || '',
        country: rep.country || '',
        distributors: getTypeStats(3, distTarget, sales),
        key_accounts: getTypeStats(2, keyTarget, sales),
        retail: getTypeStats(1, retailTarget, sales)
      };
    });

    console.log('[getSalesRepPerformance] Success! Returning performance data for', performance.length, 'sales reps');
    res.json({ success: true, data: performance, debug_sales: sales });
  } catch (err) {
    console.error('[getSalesRepPerformance] Error:', err);
    console.error('[getSalesRepPerformance] Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({ success: false, error: err.message });
  }
}; 