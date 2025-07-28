const express = require('express');
const router = express.Router();
const feedbackReportController = require('../controllers/feedbackReportController');

router.get('/', feedbackReportController.getAllFeedbackReports);
router.get('/export', feedbackReportController.exportFeedbackReportsCSV);

module.exports = router; 