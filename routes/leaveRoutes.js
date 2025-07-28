const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');

router.get('/sales-rep-leaves', leaveController.getAllSalesRepLeaves);

module.exports = router; 