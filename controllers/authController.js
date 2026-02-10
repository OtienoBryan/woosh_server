const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AuditTrailService = require('../services/auditTrailService');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Get staff from database by name
    const [staff] = await db.query(
      'SELECT * FROM staff WHERE name = ?',
      [username]
    );

    if (staff.length === 0) {
      // Log failed login attempt
      await AuditTrailService.logLogin(req, null, false, 'User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = staff[0];

    if (!user.password) {
      // Log failed login attempt
      await AuditTrailService.logLogin(req, user, false, 'No password set');
      return res.status(401).json({ message: 'No password set for this staff member' });
    }

    // Compare password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Log failed login attempt
      await AuditTrailService.logLogin(req, user, false, 'Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.name, 'with role:', user.role);
    
    // Log successful login
    await AuditTrailService.logLogin(req, user, true);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.business_email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    // Log failed login attempt
    await AuditTrailService.logLogin(req, null, false, error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    // Get user from token if available
    const user = req.user || null;
    
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
      try {
        // Decode token to get expiration time
        const decoded = jwt.decode(token);
        
        if (decoded && decoded.exp) {
          // Create hash of token for blacklist (don't store full token)
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          
          // Calculate expiration timestamp
          const expiresAt = new Date(decoded.exp * 1000);
          
          // Add token to blacklist
          await db.query(
            'INSERT INTO token_blacklist (token_hash, user_id, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE blacklisted_at = CURRENT_TIMESTAMP',
            [tokenHash, user?.id || null, expiresAt]
          );
          
          console.log('Token blacklisted for user:', user?.id || 'unknown');
        }
      } catch (blacklistError) {
        // Log error but don't fail logout if blacklisting fails
        console.error('Error blacklisting token:', blacklistError);
      }
    }
    
    // Log logout activity
    await AuditTrailService.logLogout(req, user);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  login,
  logout
}; 