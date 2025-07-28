const db = require('../database/db');

// Get all managers
exports.getAllManagers = async (req, res) => {
  try {
    console.log('[getAllManagers] Starting...');
    console.log('[getAllManagers] Querying managers table...');
    const [rows] = await db.query('SELECT * FROM managers ORDER BY name');
    console.log('[getAllManagers] Managers found:', rows.length);
    res.json(rows);
  } catch (err) {
    console.error('[getAllManagers] Error:', err);
    console.error('[getAllManagers] Error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
    res.status(500).json({ error: 'Failed to fetch managers', details: err.message });
  }
};

// Get managers performance data
exports.getManagersPerformance = async (req, res) => {
  try {
    console.log('[getManagersPerformance] Starting...');
    const { start_date, end_date } = req.query;
    console.log('[getManagersPerformance] Query params:', { start_date, end_date });

    // Get all managers
    const [managers] = await db.query('SELECT * FROM managers ORDER BY name');
    console.log('[getManagersPerformance] Managers found:', managers.length);

    // Get all sales reps
    const [salesReps] = await db.query(`
      SELECT s.id, s.name, s.region, s.route_id_update, r.name AS route_name
      FROM SalesRep s
      LEFT JOIN routes r ON s.route_id_update = r.id
    `);
    console.log('[getManagersPerformance] Sales reps found:', salesReps.length);

    // Get targets data
    const [distributorTargets] = await db.query('SELECT * FROM distributors_targets');
    const [keyAccountTargets] = await db.query('SELECT * FROM key_account_targets');
    const [retailTargets] = await db.query('SELECT * FROM retail_targets');

    // Create performance data for each sales rep
    const repPerformance = salesReps.map(rep => {
      // Get targets for this rep
      const distTarget = distributorTargets.find(t => t.sales_rep_id === rep.id) || {};
      const keyTarget = keyAccountTargets.find(t => t.sales_rep_id === rep.id) || {};
      const retailTarget = retailTargets.find(t => t.sales_rep_id === rep.id) || {};

      return {
        id: rep.id,
        name: rep.name,
        region: rep.region || '',
        route_name: rep.route_name || '',
        distributors: {
          vapes_target: distTarget.vapes_targets || 0,
          pouches_target: distTarget.pouches_targets || 0,
          vapes_sales: 0, // Will be populated if sales data exists
          pouches_sales: 0,
          total_outlets: 0,
          outlets_with_orders: 0,
          outlet_pct: 0
        },
        key_accounts: {
          vapes_target: keyTarget.vapes_targets || 0,
          pouches_target: keyTarget.pouches_targets || 0,
          vapes_sales: 0,
          pouches_sales: 0,
          total_outlets: 0,
          outlets_with_orders: 0,
          outlet_pct: 0
        },
        retail: {
          vapes_target: retailTarget.vapes_targets || 0,
          pouches_target: retailTarget.pouches_targets || 0,
          vapes_sales: 0,
          pouches_sales: 0,
          total_outlets: 0,
          outlets_with_orders: 0,
          outlet_pct: 0
        }
      };
    });

    console.log('[getManagersPerformance] Success! Returning performance data for', repPerformance.length, 'sales reps');
    res.json({ success: true, data: repPerformance });
  } catch (err) {
    console.error('[getManagersPerformance] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a new manager
exports.createManager = async (req, res) => {
  const { name, email, phoneNumber, country, region, managerTypeId } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO managers (name, email, phoneNumber, country, region, managerTypeId) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phoneNumber, country, region, managerTypeId]
    );
    res.status(201).json({ id: result.insertId, name, email, phoneNumber, country, region, managerTypeId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create manager', details: err.message });
  }
};

// Update a manager
exports.updateManager = async (req, res) => {
  const { id } = req.params;
  const { name, email, phoneNumber, country, region, managerTypeId } = req.body;
  try {
    await db.query(
      'UPDATE managers SET name = ?, email = ?, phoneNumber = ?, country = ?, region = ?, managerTypeId = ? WHERE id = ?',
      [name, email, phoneNumber, country, region, managerTypeId, id]
    );
    res.json({ id, name, email, phoneNumber, country, region, managerTypeId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update manager', details: err.message });
  }
};

// Delete a manager
exports.deleteManager = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM managers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete manager', details: err.message });
  }
}; 