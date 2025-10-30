console.log('=== MY VISIBILITY REPORT ROUTES FILE IS LOADING ===');

const express = require('express');
const router = express.Router();
const myVisibilityReportController = require('../controllers/myVisibilityReportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all my visibility report routes
router.use(authenticateToken);

// Get filter options (outlets and countries)
router.get('/filter-options', myVisibilityReportController.getFilterOptions);

// Get all visibility reports with pagination and filtering
router.get('/', myVisibilityReportController.getAllMyVisibilityReports);

module.exports = router; 