const db = require('../database/db');

/**
 * Audit Trail Service
 * Provides functions to log user activities in the system
 */
class AuditTrailService {
  /**
   * Log an activity to the audit trail
   * @param {Object} activity - Activity details
   * @param {number} activity.userId - User ID
   * @param {string} activity.userName - User name
   * @param {string} activity.userRole - User role
   * @param {string} activity.action - Action type (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW, etc.)
   * @param {string} activity.entityType - Entity type (staff, client, invoice, etc.)
   * @param {number} activity.entityId - Entity ID
   * @param {string} activity.description - Description of the action
   * @param {string} activity.ipAddress - IP address
   * @param {string} activity.userAgent - User agent
   * @param {string} activity.requestMethod - HTTP method
   * @param {string} activity.requestUrl - Request URL
   * @param {Object} activity.requestBody - Request body
   * @param {number} activity.responseStatus - HTTP response status
   * @param {boolean} activity.success - Whether action was successful
   * @param {string} activity.errorMessage - Error message if failed
   * @param {string} activity.sessionId - Session ID
   */
  static async logActivity(activity) {
    try {
      const {
        userId,
        userName,
        userRole,
        action,
        entityType = null,
        entityId = null,
        description = null,
        ipAddress = null,
        userAgent = null,
        requestMethod = null,
        requestUrl = null,
        requestBody = null,
        responseStatus = null,
        success = true,
        errorMessage = null,
        sessionId = null
      } = activity;

      // Validate required fields
      if (!userId || !userName || !action) {
        console.error('Audit trail: Missing required fields', { userId, userName, action });
        return;
      }

      // Prepare request body for storage (limit size to prevent huge logs)
      let requestBodyJson = null;
      if (requestBody) {
        try {
          const bodyStr = JSON.stringify(requestBody);
          // Limit to 10KB to prevent database bloat
          if (bodyStr.length <= 10000) {
            requestBodyJson = bodyStr;
          } else {
            requestBodyJson = JSON.stringify({ 
              _truncated: true, 
              _size: bodyStr.length,
              _preview: bodyStr.substring(0, 1000) 
            });
          }
        } catch (error) {
          console.error('Error stringifying request body for audit trail:', error);
        }
      }

      const query = `
        INSERT INTO audit_trail (
          user_id, user_name, user_role, action, entity_type, entity_id,
          description, ip_address, user_agent, request_method, request_url,
          request_body, response_status, success, error_message, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.query(query, [
        userId,
        userName,
        userRole || null,
        action,
        entityType,
        entityId,
        description,
        ipAddress,
        userAgent,
        requestMethod,
        requestUrl,
        requestBodyJson,
        responseStatus,
        success,
        errorMessage,
        sessionId
      ]);

    } catch (error) {
      // Don't throw errors - audit trail failures shouldn't break the application
      console.error('Error logging to audit trail:', error);
    }
  }

  /**
   * Get client IP address from request
   */
  static getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Get user agent from request
   */
  static getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
  }

  /**
   * Log login activity
   */
  static async logLogin(req, user, success = true, errorMessage = null) {
    await this.logActivity({
      userId: user?.id || null,
      userName: user?.name || req.body?.username || 'unknown',
      userRole: user?.role || null,
      action: 'LOGIN',
      description: success 
        ? `User ${user?.name || req.body?.username} logged in successfully`
        : `Failed login attempt for ${req.body?.username || 'unknown'}: ${errorMessage || 'Invalid credentials'}`,
      ipAddress: this.getClientIp(req),
      userAgent: this.getUserAgent(req),
      requestMethod: req.method,
      requestUrl: req.originalUrl || req.url,
      responseStatus: success ? 200 : 401,
      success,
      errorMessage
    });
  }

  /**
   * Log logout activity
   */
  static async logLogout(req, user) {
    await this.logActivity({
      userId: user?.id || null,
      userName: user?.name || 'unknown',
      userRole: user?.role || null,
      action: 'LOGOUT',
      description: `User ${user?.name || 'unknown'} logged out`,
      ipAddress: this.getClientIp(req),
      userAgent: this.getUserAgent(req),
      requestMethod: req.method,
      requestUrl: req.originalUrl || req.url,
      responseStatus: 200,
      success: true
    });
  }

  /**
   * Log API request activity
   */
  static async logApiRequest(req, res, action, entityType = null, entityId = null, description = null) {
    // Only log if user is authenticated
    if (!req.user) {
      return;
    }

    const success = res.statusCode < 400;
    const errorMessage = success ? null : res.locals.errorMessage || 'Request failed';

    await this.logActivity({
      userId: req.user.id || req.user.userId,
      userName: req.user.name || 'unknown',
      userRole: req.user.role || null,
      action,
      entityType,
      entityId,
      description: description || `${action} ${entityType || 'resource'}`,
      ipAddress: this.getClientIp(req),
      userAgent: this.getUserAgent(req),
      requestMethod: req.method,
      requestUrl: req.originalUrl || req.url,
      requestBody: req.method !== 'GET' ? req.body : null,
      responseStatus: res.statusCode,
      success,
      errorMessage
    });
  }
}

module.exports = AuditTrailService;
