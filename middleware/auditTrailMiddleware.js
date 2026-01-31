const AuditTrailService = require('../services/auditTrailService');

/**
 * Audit Trail Middleware
 * Automatically logs API requests to the audit trail
 */
const auditTrailMiddleware = (options = {}) => {
  const {
    excludePaths = ['/api/health', '/api/auth/login'], // Paths to exclude from logging
    excludeMethods = ['OPTIONS'], // HTTP methods to exclude
    logRequestBody = true, // Whether to log request body
    logResponseBody = false // Whether to log response body (usually not needed)
  } = options;

  return async (req, res, next) => {
    // Skip if path is excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip if method is excluded
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // Skip GET requests (VIEW actions) - don't log view operations
    if (req.method === 'GET') {
      return next();
    }

    // Store original end function
    const originalEnd = res.end;
    const originalJson = res.json;

    // Override res.end to capture response status
    res.end = function(chunk, encoding) {
      // Log the activity after response is sent
      // Check req.user here (after authentication middleware has run)
      setImmediate(async () => {
        try {
          // Skip if user is not authenticated (login endpoint handles its own logging)
          // Check here because authentication middleware runs after this middleware
          if (!req.user) {
            // Debug: Uncomment to see which requests are being skipped
            // console.log('Audit trail: Skipping unauthenticated request:', req.method, req.path);
            return;
          }
          
          // Debug: Uncomment to see which requests are being logged
          // console.log('Audit trail: Logging request:', req.method, req.path, 'User:', req.user.name);

          // Determine action type from HTTP method and path
          let action = 'VIEW';
          if (req.method === 'POST') {
            action = 'CREATE';
          } else if (req.method === 'PUT' || req.method === 'PATCH') {
            action = 'UPDATE';
          } else if (req.method === 'DELETE') {
            action = 'DELETE';
          } else if (req.method === 'GET') {
            action = 'VIEW';
          }

          // Extract entity type from URL (e.g., /api/staff -> 'staff')
          const pathParts = req.path.split('/').filter(p => p);
          let entityType = null;
          let entityId = null;

          if (pathParts.length >= 2 && pathParts[0] === 'api') {
            entityType = pathParts[1];
            // Check if there's an ID in the path (e.g., /api/staff/123)
            if (pathParts.length >= 3 && !isNaN(pathParts[2])) {
              entityId = parseInt(pathParts[2]);
            }
          }

          // Generate description
          let description = `${req.method} ${req.path}`;
          if (entityType && entityId) {
            description = `${action} ${entityType} (ID: ${entityId})`;
          } else if (entityType) {
            description = `${action} ${entityType}`;
          }

          await AuditTrailService.logApiRequest(
            req,
            res,
            action,
            entityType,
            entityId,
            description
          );
        } catch (error) {
          // Don't let audit trail errors break the request
          console.error('Error in audit trail middleware:', error);
        }
      });

      // Call original end function
      originalEnd.call(this, chunk, encoding);
    };

    // Override res.json to capture response status
    res.json = function(body) {
      // Call original json function
      originalJson.call(this, body);
    };

    next();
  };
};

module.exports = auditTrailMiddleware;
