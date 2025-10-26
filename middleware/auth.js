const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user info to request
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required',
        message: 'No authentication token provided'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            success: false, 
            error: 'Token expired',
            message: 'Your session has expired. Please login again.'
          });
        }
        
        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({ 
            success: false, 
            error: 'Invalid token',
            message: 'Authentication token is invalid'
          });
        }

        return res.status(403).json({ 
          success: false, 
          error: 'Token verification failed',
          message: 'Failed to authenticate token'
        });
      }

      // Attach user info to request
      // Map userId to id for consistency across the application
      req.user = {
        ...user,
        id: user.userId || user.id
      };

      next();
    });
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user info if token is valid, but doesn't block request if token is missing
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        req.user = null;
      } else {
        req.user = {
          ...user,
          id: user.userId || user.id
        };
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * Checks if authenticated user has required role(s)
 * @param {string|array} roles - Required role(s) (e.g., 'admin' or ['admin', 'manager'])
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Validate JWT_SECRET exists
 */
const validateJWTSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key' || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.error('\n⚠️  WARNING: JWT_SECRET is not properly configured!');
    console.error('⚠️  Please set a strong JWT_SECRET in your .env file for production use.\n');
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  validateJWTSecret
};

