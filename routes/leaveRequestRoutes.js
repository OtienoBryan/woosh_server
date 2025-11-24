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

// GET /api/leave-requests/report
router.get('/report', leaveRequestController.getLeaveReport);

// GET /api/leave-requests/maternal-leave-report
router.get('/maternal-leave-report', leaveRequestController.getMaternalLeaveReport);

// GET /api/leave-requests/sick-leave-report
router.get('/sick-leave-report', leaveRequestController.getSickLeaveReport);

// GET /api/leave-requests/compassionate-leave-report
router.get('/compassionate-leave-report', leaveRequestController.getCompassionateLeaveReport);

// PATCH /api/leave-requests/:id/status
router.patch('/:id/status', leaveRequestController.updateLeaveRequestStatus);

module.exports = router; 

