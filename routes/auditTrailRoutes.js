const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/audit-trail
 * Get audit trail records with filtering and pagination
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 50, max: 500)
 * - userId: Filter by user ID
 * - userName: Filter by user name (partial match)
 * - action: Filter by action type
 * - entityType: Filter by entity type
 * - startDate: Start date (ISO format)
 * - endDate: End date (ISO format)
 * - success: Filter by success status (true/false)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      userName,
      action,
      entityType,
      startDate,
      endDate,
      success
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }

    if (userName) {
      conditions.push('user_name LIKE ?');
      params.push(`%${userName}%`);
    }

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (entityType) {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    if (success !== undefined) {
      conditions.push('success = ?');
      params.push(success === 'true' ? 1 : 0);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM audit_trail ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get records
    const [records] = await db.query(
      `SELECT * FROM audit_trail 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // Parse JSON fields
    const parsedRecords = records.map(record => {
      if (record.request_body) {
        try {
          record.request_body = JSON.parse(record.request_body);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return record;
    });

    res.json({
      success: true,
      data: parsedRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching audit trail',
      error: error.message 
    });
  }
});

/**
 * GET /api/audit-trail/stats
 * Get audit trail statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE created_at >= ? AND created_at <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE created_at >= ?';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE created_at <= ?';
      params.push(endDate);
    }

    // Get total activities
    const [totalResult] = await db.query(
      `SELECT COUNT(*) as total FROM audit_trail ${dateFilter}`,
      params
    );

    // Get activities by action
    const [actionsResult] = await db.query(
      `SELECT action, COUNT(*) as count 
       FROM audit_trail 
       ${dateFilter}
       GROUP BY action 
       ORDER BY count DESC`,
      params
    );

    // Get activities by user
    const [usersResult] = await db.query(
      `SELECT user_id, user_name, user_role, COUNT(*) as count 
       FROM audit_trail 
       ${dateFilter}
       GROUP BY user_id, user_name, user_role 
       ORDER BY count DESC 
       LIMIT 10`,
      params
    );

    // Get login/logout stats
    const [loginStats] = await db.query(
      `SELECT 
         COUNT(*) as total_logins,
         SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
         SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_logins
       FROM audit_trail 
       WHERE action = 'LOGIN' ${dateFilter.replace('WHERE', 'AND') || ''}`,
      params
    );

    res.json({
      success: true,
      data: {
        total: totalResult[0].total,
        byAction: actionsResult,
        byUser: usersResult,
        loginStats: loginStats[0] || { total_logins: 0, successful_logins: 0, failed_logins: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching audit trail stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching audit trail statistics',
      error: error.message 
    });
  }
});

/**
 * GET /api/audit-trail/:id
 * Get a specific audit trail record
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [records] = await db.query(
      'SELECT * FROM audit_trail WHERE id = ?',
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Audit trail record not found' 
      });
    }

    const record = records[0];
    
    // Parse JSON fields
    if (record.request_body) {
      try {
        record.request_body = JSON.parse(record.request_body);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error fetching audit trail record:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching audit trail record',
      error: error.message 
    });
  }
});

module.exports = router;
