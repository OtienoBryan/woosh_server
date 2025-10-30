const express = require('express');
const router = express.Router();
const { getCustomerOrdersData } = require('../controllers/customerOrdersController');
const { authenticateToken } = require('../middleware/auth');

// Get all customer orders data (consolidated endpoint with pagination)
router.get('/data', authenticateToken, getCustomerOrdersData);

module.exports = router;


