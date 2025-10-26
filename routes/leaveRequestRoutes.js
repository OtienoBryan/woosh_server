const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all leave request routes
router.use(authenticateToken);

// GET /api/leave-requests
router.get('/', leaveRequestController.getAllLeaveRequests);

// GET /api/leave-requests/employee-leaves
router.get('/employee-leaves', leaveRequestController.getEmployeeLeaves);

// PATCH /api/leave-requests/:id/status
router.patch('/:id/status', leaveRequestController.updateLeaveRequestStatus);

module.exports = router; 

