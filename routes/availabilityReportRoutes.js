const express = require('express');
const router = express.Router();
const availabilityReportController = require('../controllers/availabilityReportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all availability report routes
router.use(authenticateToken);

router.get('/', availabilityReportController.getAllAvailabilityReports);
router.get('/export', availabilityReportController.exportAvailabilityReportsCSV);

module.exports = router; 