const express = require('express');
const router = express.Router();
const availabilityReportController = require('../controllers/availabilityReportController');

router.get('/', availabilityReportController.getAllAvailabilityReports);
router.get('/export', availabilityReportController.exportAvailabilityReportsCSV);

module.exports = router; 