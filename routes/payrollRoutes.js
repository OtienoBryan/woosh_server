const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all payroll routes
router.use(authenticateToken);

// GET /api/payroll/payment-accounts
router.get('/payment-accounts', payrollController.getPaymentAccounts);

// GET /api/payroll/history?staff_id=...
router.get('/history', payrollController.getPayrollHistory);

// POST /api/payroll/history
router.post('/history', payrollController.addPayrollRecord);

// POST /api/payroll/run
router.post('/run', payrollController.runPayroll);

module.exports = router; 