const express = require('express');
const router = express.Router();
const feedbackReportController = require('../controllers/feedbackReportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all feedback report routes
router.use(authenticateToken);

router.get('/', feedbackReportController.getAllFeedbackReports);
router.get('/export', feedbackReportController.exportFeedbackReportsCSV);

module.exports = router; 