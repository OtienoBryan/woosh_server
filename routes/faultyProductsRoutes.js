const express = require('express');
const router = express.Router();
const faultyProductsController = require('../controllers/faultyProductsController');
const { authenticateToken } = require('../middleware/auth');

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