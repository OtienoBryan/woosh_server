const connection = require('../database/db');

const faultyProductsController = {
  // Get all faulty product reports with pagination and filtering
  getAllReports: async (req, res) => {
    try {
      const { page = 1, limit = 20, search, status, store_id } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (p.product_name LIKE ? OR p.product_code LIKE ? OR fpr.resolution_notes LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (status) {
        whereClause += ' AND fpr.status = ?';
        params.push(status);
      }

      if (store_id) {
        whereClause += ' AND fpr.store_id = ?';
        params.push(store_id);
      }

      const [reports] = await connection.query(`
        SELECT 
          fpr.*,
          s.store_name,
          u1.username as reported_by_name,
          u2.username as assigned_to_name,
          COUNT(fpi.id) as total_items
        FROM faulty_products_reports fpr
        LEFT JOIN stores s ON fpr.store_id = s.id
        LEFT JOIN users u1 ON fpr.reported_by = u1.id
        LEFT JOIN users u2 ON fpr.assigned_to = u2.id
        LEFT JOIN faulty_products_items fpi ON fpr.id = fpi.report_id
        ${whereClause}
        GROUP BY fpr.id
        ORDER BY fpr.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]);

      // Get total count for pagination
      const [countResult] = await connection.query(`
        SELECT COUNT(DISTINCT fpr.id) as total
        FROM faulty_products_reports fpr
        LEFT JOIN faulty_products_items fpi ON fpr.id = fpi.report_id
        LEFT JOIN products p ON fpi.product_id = p.id
        ${whereClause}
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: reports,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching faulty product reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch faulty product reports'
      });
    }
  },

  // Get report by ID with all items
  getReportById: async (req, res) => {
    try {
      const { id } = req.params;

      // Get the main report
      const [reports] = await connection.query(`
        SELECT 
          fpr.*,
          s.store_name,
          u1.username as reported_by_name,
          u2.username as assigned_to_name
        FROM faulty_products_reports fpr
        LEFT JOIN stores s ON fpr.store_id = s.id
        LEFT JOIN users u1 ON fpr.reported_by = u1.id
        LEFT JOIN users u2 ON fpr.assigned_to = u2.id
        WHERE fpr.id = ?
      `, [id]);

      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Faulty product report not found'
        });
      }

      // Get all items in the report
      const [items] = await connection.query(`
        SELECT 
          fpi.*,
          p.product_name,
          p.product_code,
          p.description
        FROM faulty_products_items fpi
        LEFT JOIN products p ON fpi.product_id = p.id
        WHERE fpi.report_id = ?
        ORDER BY fpi.created_at ASC
      `, [id]);

      const report = reports[0];
      report.items = items;

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error fetching faulty product report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch faulty product report'
      });
    }
  },

  // Create new faulty product report with items
  createReport: async (req, res) => {
    try {
      const { store_id, items } = req.body;

      // Validation
      if (!store_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Store ID and items are required'
        });
      }

      // Check if store exists
      const [stores] = await connection.query(`
        SELECT id FROM stores WHERE id = ?
      `, [store_id]);

      if (stores.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Store not found'
        });
      }

      // Validate items
      for (const item of items) {
        if (!item.product_id || !item.quantity || !item.fault_comment) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have product_id, quantity, and fault_comment'
          });
        }

        // Check if product exists
        const [products] = await connection.query(`
          SELECT id FROM products WHERE id = ?
        `, [item.product_id]);

        if (products.length === 0) {
          return res.status(400).json({
            success: false,
            error: `Product with ID ${item.product_id} not found`
          });
        }
      }

      // Check inventory levels for all items
      const insufficientItems = [];
      
      console.log(`🔍 Checking inventory for store_id: ${store_id}`);
      
      for (const item of items) {
        console.log(`📦 Checking product_id: ${item.product_id}, requested: ${item.quantity}`);
        
        // Check inventory level for this product in the selected store
        const [inventory] = await connection.query(`
          SELECT si.quantity 
          FROM store_inventory si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.store_id = ? AND si.product_id = ? AND p.is_active = true
        `, [store_id, item.product_id]);

        const availableQuantity = inventory.length > 0 ? inventory[0].quantity : 0;
        
        console.log(`📊 Product ${item.product_id}: Available = ${availableQuantity}, Requested = ${item.quantity}`);
        
        if (availableQuantity < item.quantity) {
          insufficientItems.push({
            product_id: item.product_id,
            requested: item.quantity,
            available: availableQuantity
          });
          console.log(`❌ Insufficient inventory for product ${item.product_id}`);
        } else {
          console.log(`✅ Sufficient inventory for product ${item.product_id}`);
        }
      }

      // If there are insufficient items, return error with details - NO EXCEPTIONS
      if (insufficientItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot create report - insufficient inventory for some products',
          insufficient_items: insufficientItems
        });
      }

      // Get a connection from the pool for transaction
      const conn = await connection.getConnection();

      try {
        // Start transaction
        await conn.beginTransaction();

        // Create the main report
        const [reportResult] = await conn.query(`
          INSERT INTO faulty_products_reports (
            store_id, reported_by, reported_date
          ) VALUES (?, ?, CURDATE())
        `, [store_id, req.user.userId]); // Use the user ID from JWT token

        const reportId = reportResult.insertId;

        // Insert all items
        for (const item of items) {
          await conn.query(`
            INSERT INTO faulty_products_items (
              report_id, product_id, quantity, fault_comment
            ) VALUES (?, ?, ?, ?)
          `, [reportId, item.product_id, item.quantity, item.fault_comment]);
        }

        await conn.commit();

        // Get the created report with items
        const [createdReports] = await connection.query(`
          SELECT 
            fpr.*,
            s.store_name,
            u1.username as reported_by_name
          FROM faulty_products_reports fpr
          LEFT JOIN stores s ON fpr.store_id = s.id
          LEFT JOIN users u1 ON fpr.reported_by = u1.id
          WHERE fpr.id = ?
        `, [reportId]);

        const [createdItems] = await connection.query(`
          SELECT 
            fpi.*,
            p.product_name,
            p.product_code
          FROM faulty_products_items fpi
          LEFT JOIN products p ON fpi.product_id = p.id
          WHERE fpi.report_id = ?
        `, [reportId]);

        const report = createdReports[0];
        report.items = createdItems;

        res.status(201).json({
          success: true,
          data: report,
          message: 'Faulty product report created successfully'
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Error creating faulty product report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create faulty product report'
      });
    }
  },

  // Update report status
  updateReportStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assigned_to, resolution_notes } = req.body;

      // Check if report exists
      const [reports] = await connection.query(`
        SELECT id FROM faulty_products_reports WHERE id = ?
      `, [id]);

      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Faulty product report not found'
        });
      }

      // Update report
      await connection.query(`
        UPDATE faulty_products_reports SET
          status = ?,
          assigned_to = ?,
          resolution_notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, assigned_to, resolution_notes, id]);

      // Get the updated report
      const [updatedReports] = await connection.query(`
        SELECT 
          fpr.*,
          s.store_name,
          u1.username as reported_by_name,
          u2.username as assigned_to_name
        FROM faulty_products_reports fpr
        LEFT JOIN stores s ON fpr.store_id = s.id
        LEFT JOIN users u1 ON fpr.reported_by = u1.id
        LEFT JOIN users u2 ON fpr.assigned_to = u2.id
        WHERE fpr.id = ?
      `, [id]);

      res.json({
        success: true,
        data: updatedReports[0],
        message: 'Faulty product report updated successfully'
      });
    } catch (error) {
      console.error('Error updating faulty product report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update faulty product report'
      });
    }
  },

  // Delete report
  deleteReport: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if report exists
      const [reports] = await connection.query(`
        SELECT id FROM faulty_products_reports WHERE id = ?
      `, [id]);

      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Faulty product report not found'
        });
      }

      // Delete report (items will be deleted automatically due to CASCADE)
      await connection.query(`
        DELETE FROM faulty_products_reports WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Faulty product report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting faulty product report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete faulty product report'
      });
    }
  },

  // Get report statistics
  getReportStats: async (req, res) => {
    try {
      const [stats] = await connection.query(`
        SELECT 
          COUNT(*) as total_reports,
          COUNT(CASE WHEN status = 'Reported' THEN 1 END) as reported,
          COUNT(CASE WHEN status = 'Under Investigation' THEN 1 END) as under_investigation,
          COUNT(CASE WHEN status = 'Being Repaired' THEN 1 END) as being_repaired,
          COUNT(CASE WHEN status = 'Repaired' THEN 1 END) as repaired,
          COUNT(CASE WHEN status = 'Replaced' THEN 1 END) as replaced,
          COUNT(CASE WHEN status = 'Disposed' THEN 1 END) as disposed,
          COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed
        FROM faulty_products_reports
      `);

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error fetching report statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report statistics'
      });
    }
  }
};

module.exports = faultyProductsController; 