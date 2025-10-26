console.log('=== VISIBILITY REPORT ROUTES FILE IS LOADING ===');

const express = require('express');
const router = express.Router();
const visibilityReportController = require('../controllers/visibilityReportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all visibility report routes
router.use(authenticateToken);

// Get all visibility reports
router.get('/', visibilityReportController.getAllVisibilityReports);

// Get visibility reports by user ID
router.get('/user', visibilityReportController.getVisibilityReportsByUser);

// Get visibility report by ID
router.get('/:id', visibilityReportController.getVisibilityReport);

// Create new visibility report
router.post('/', visibilityReportController.createVisibilityReport);

// Update visibility report
router.put('/:id', visibilityReportController.updateVisibilityReport);

// Delete visibility report
router.delete('/:id', visibilityReportController.deleteVisibilityReport);

module.exports = router; 