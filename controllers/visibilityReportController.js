console.log('=== VISIBILITY REPORT CONTROLLER IS LOADING ===');

const db = require('../config/database');

const visibilityReportController = {
  // Get all visibility reports
  getAllVisibilityReports: async (req, res) => {
    try {
      const { currentDate, startDate, endDate, salesRep, search } = req.query;
      
      let query = `
        SELECT vr.id, vr.reportId, vr.comment, vr.imageUrl, vr.createdAt,
               c.name AS outlet, co.name AS country, s.name AS salesRep
        FROM VisibilityReport vr
        LEFT JOIN Clients c ON vr.clientId = c.id
        LEFT JOIN Country co ON c.countryId = co.id
        LEFT JOIN SalesRep s ON vr.userId = s.id
      `;
      
      const params = [];
      const whereConditions = [];
      
      // Add date filtering
      if (currentDate) {
        whereConditions.push(`DATE(vr.createdAt) = ?`);
        params.push(currentDate);
      } else if (startDate && endDate) {
        whereConditions.push(`DATE(vr.createdAt) BETWEEN ? AND ?`);
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push(`DATE(vr.createdAt) >= ?`);
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push(`DATE(vr.createdAt) <= ?`);
        params.push(endDate);
      }
      
      // Add sales rep filter
      if (salesRep && salesRep !== 'all') {
        whereConditions.push(`s.name = ?`);
        params.push(salesRep);
      }
      
      // Add search filter
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR s.name LIKE ? OR vr.comment LIKE ?)`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY vr.createdAt DESC`;
      
      const [reports] = await db.query(query, params);
      
      res.json({
        success: true,
        data: reports,
        pagination: {
          page: 1,
          limit: reports.length,
          total: reports.length,
          totalPages: 1
        }
      });
    } catch (error) {
      console.error('Error fetching visibility reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch visibility reports',
        error: error.message
      });
    }
  },

  // Get visibility reports by user ID
  getVisibilityReportsByUser: async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const query = `
        SELECT vr.*,
               s.name as user_name,
               c.name as client_name,
               c.name as client_company_name
        FROM VisibilityReport vr
        LEFT JOIN SalesRep s ON vr.userId = s.id
        LEFT JOIN Clients c ON vr.clientId = c.id
        WHERE vr.userId = ?
        ORDER BY vr.createdAt DESC
      `;
      
      const [reports] = await db.query(query, [userId]);
      
      res.json({
        success: true,
        message: 'Visibility reports fetched successfully',
        visibilityReports: reports
      });
    } catch (error) {
      console.error('Error fetching visibility reports by user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch visibility reports',
        error: error.message
      });
    }
  },

  // Get visibility report by ID
  getVisibilityReport: async (req, res) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT vr.*,
               s.name as user_name,
               c.name as client_name,
               c.name as client_company_name
        FROM VisibilityReport vr
        LEFT JOIN SalesRep s ON vr.userId = s.id
        LEFT JOIN Clients c ON vr.clientId = c.id
        WHERE vr.id = ?
      `;
      
      const [reports] = await db.query(query, [id]);
      
      if (reports.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Visibility report not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Visibility report fetched successfully',
        visibilityReport: reports[0]
      });
    } catch (error) {
      console.error('Error fetching visibility report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch visibility report',
        error: error.message
      });
    }
  },

  // Create new visibility report
  createVisibilityReport: async (req, res) => {
    try {
      const {
        userId,
        clientId,
        latitude,
        longitude,
        imageUrl,
        notes,
        status
      } = req.body;

      // Validate required fields
      if (!userId || !clientId) {
        return res.status(400).json({
          success: false,
          message: 'userId and clientId are required'
        });
      }

      const query = `
        INSERT INTO VisibilityReport 
        (userId, clientId, latitude, longitude, imageUrl, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const [result] = await db.query(query, [
        userId,
        clientId,
        latitude || null,
        longitude || null,
        imageUrl || null,
        notes || null,
        status || 0
      ]);
      
      // Fetch the created report
      const [newReport] = await db.query(`
        SELECT vr.*,
               s.name as user_name,
               c.name as client_name,
               c.name as client_company_name
        FROM VisibilityReport vr
        LEFT JOIN SalesRep s ON vr.userId = s.id
        LEFT JOIN Clients c ON vr.clientId = c.id
        WHERE vr.id = ?
      `, [result.insertId]);
      
      res.status(201).json({
        success: true,
        message: 'Visibility report created successfully',
        visibilityReport: newReport[0]
      });
    } catch (error) {
      console.error('Error creating visibility report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create visibility report',
        error: error.message
      });
    }
  },

  // Update visibility report
  updateVisibilityReport: async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = req.body;
      
      // Remove undefined fields
      Object.keys(updateFields).forEach(key => {
        if (updateFields[key] === undefined) {
          delete updateFields[key];
        }
      });
      
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      // Build dynamic update query
      const setClause = Object.keys(updateFields)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const query = `UPDATE VisibilityReport SET ${setClause} WHERE id = ?`;
      const values = [...Object.values(updateFields), id];
      
      const [result] = await db.query(query, values);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Visibility report not found'
        });
      }
      
      // Fetch the updated report
      const [updatedReport] = await db.query(`
        SELECT vr.*,
               s.name as user_name,
               c.name as client_name,
               c.name as client_company_name
        FROM VisibilityReport vr
        LEFT JOIN SalesRep s ON vr.userId = s.id
        LEFT JOIN Clients c ON vr.clientId = c.id
        WHERE vr.id = ?
      `, [id]);
      
      res.json({
        success: true,
        message: 'Visibility report updated successfully',
        visibilityReport: updatedReport[0]
      });
    } catch (error) {
      console.error('Error updating visibility report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update visibility report',
        error: error.message
      });
    }
  },

  // Delete visibility report
  deleteVisibilityReport: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('DELETE FROM VisibilityReport WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Visibility report not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Visibility report deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting visibility report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete visibility report',
        error: error.message
      });
    }
  }
};

module.exports = visibilityReportController; 