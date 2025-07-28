console.log('=== MY VISIBILITY REPORT ROUTES FILE IS LOADING ===');

const express = require('express');
const router = express.Router();
const myVisibilityReportController = require('../controllers/myVisibilityReportController');

// Simple test route
router.get('/', myVisibilityReportController.getAllMyVisibilityReports);

module.exports = router; 