console.log('=== MY VISIBILITY REPORT ROUTES FILE IS LOADING ===');

const express = require('express');
const router = express.Router();
const myVisibilityReportController = require('../controllers/myVisibilityReportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all my visibility report routes
router.use(authenticateToken);

// Simple test route
router.get('/', myVisibilityReportController.getAllMyVisibilityReports);

module.exports = router; 