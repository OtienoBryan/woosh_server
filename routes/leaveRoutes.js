const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all leave routes
router.use(authenticateToken);

router.get('/sales-rep-leaves', leaveController.getAllSalesRepLeaves);
router.patch('/:id/status', leaveController.updateLeaveStatus);

module.exports = router; 