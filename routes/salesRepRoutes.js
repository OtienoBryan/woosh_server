const express = require('express');
const router = express.Router();
const salesRepController = require('../controllers/salesRepController');

// Get all sales representatives
router.get('/', salesRepController.getAllSalesReps);

// Get sales representative by ID
router.get('/:id', salesRepController.getSalesRep);

// Create new sales representative
router.post('/', salesRepController.createSalesRep);

// Update sales representative
router.put('/:id', salesRepController.updateSalesRep);

// Delete sales representative
router.delete('/:id', salesRepController.deleteSalesRep);

module.exports = router;
