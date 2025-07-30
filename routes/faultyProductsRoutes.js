const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const faultyProductsController = require('../controllers/faultyProductsController');

// Simple JWT auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Apply auth middleware to all faulty products routes
router.use(authenticateToken);

// Get all faulty product reports with pagination and filtering
router.get('/', faultyProductsController.getAllReports);

// Get report by ID with all items
router.get('/:id', faultyProductsController.getReportById);

// Create new faulty product report with items
router.post('/', faultyProductsController.createReport);

// Update report status
router.put('/:id/status', faultyProductsController.updateReportStatus);

// Delete report
router.delete('/:id', faultyProductsController.deleteReport);

// Get report statistics
router.get('/stats/overview', faultyProductsController.getReportStats);

module.exports = router; 