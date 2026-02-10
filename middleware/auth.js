const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user info to request
 * Checks token blacklist to prevent reuse of logged-out tokens
 */
const authenticateToken = async (req, res, next) => {
  console.log('=== AUTH MIDDLEWARE HIT ===', req.url);
  
  try {
    const authHeader = req.headers['authorization'];
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required',
        message: 'Unathorized Access. Please login to continue.'
      });
    }
    
    console.log('Token found, checking blacklist...');

    // Check if token is blacklisted
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const [blacklistCheck] = await db.query(
        'SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > NOW()',
        [tokenHash]
      );

      if (blacklistCheck.length > 0) {
        console.log('Token is blacklisted - user has logged out');
        return res.status(401).json({ 
          success: false, 
          error: 'Token invalidated',
          message: 'This token has been invalidated. Please login again.'
        });
      }
    } catch (blacklistError) {
      // If blacklist check fails, log but continue with token verification
      // This ensures the system still works if the blacklist table doesn't exist yet
      console.warn('Blacklist check failed (table may not exist):', blacklistError.message);
    }
    
    console.log('Token not blacklisted, verifying...');

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
 * Also checks token blacklist
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Check if token is blacklisted
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const [blacklistCheck] = await db.query(
        'SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > NOW()',
        [tokenHash]
      );

      if (blacklistCheck.length > 0) {
        req.user = null;
        return next();
      }
    } catch (blacklistError) {
      // If blacklist check fails, continue with token verification
      console.warn('Blacklist check failed in optionalAuth:', blacklistError.message);
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

