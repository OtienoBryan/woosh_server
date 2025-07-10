const db = require('../database/db');

const storeController = {
  // Get all stores
  getAllStores: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT * FROM stores 
        WHERE is_active = true 
        ORDER BY store_name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching stores:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stores' });
    }
  },

  // Get store by ID
  getStoreById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM stores WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Store not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching store:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store' });
    }
  },

  // Get store inventory (running balance for a specific store)
  getStoreInventory: async (req, res) => {
    try {
      const { storeId } = req.params;
      
      const [rows] = await db.query(`
        SELECT 
          si.*,
          p.product_name,
          p.product_code,
          p.category,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price
        FROM store_inventory si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.store_id = ? AND p.is_active = true
        ORDER BY p.product_name
      `, [storeId]);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching store inventory:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch store inventory' });
    }
  },

  // Get all stores inventory summary
  getAllStoresInventory: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          s.store_name,
          s.store_code,
          p.product_name,
          p.product_code,
          p.category,
          si.quantity,
          p.unit_of_measure,
          p.cost_price,
          p.selling_price,
          (si.quantity * p.cost_price) as inventory_value
        FROM store_inventory si
        LEFT JOIN stores s ON si.store_id = s.id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.is_active = true AND p.is_active = true
        ORDER BY s.store_name, p.product_name
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching all stores inventory:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stores inventory' });
    }
  },

  // Get inventory summary by store
  getInventorySummaryByStore: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          s.id,
          s.store_name,
          s.store_code,
          COUNT(si.product_id) as total_products,
          SUM(si.quantity) as total_items,
          SUM(si.quantity * p.cost_price) as total_inventory_value
        FROM stores s
        LEFT JOIN store_inventory si ON s.id = si.store_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.is_active = true
        GROUP BY s.id, s.store_name, s.store_code
        ORDER BY s.store_name
      `);
      
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch inventory summary' });
    }
  }
};

module.exports = storeController; 