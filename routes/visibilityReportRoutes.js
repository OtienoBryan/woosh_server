console.log('=== VISIBILITY REPORT ROUTES FILE IS LOADING ===');

const express = require('express');
const router = express.Router();
const visibilityReportController = require('../controllers/visibilityReportController');

// Simple test route
router.get('/', visibilityReportController.getAllVisibilityReports);

module.exports = router; 