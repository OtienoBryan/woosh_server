const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all supplier routes
router.use(authenticateToken);

// Get all suppliers
router.get('/suppliers', supplierController.getAllSuppliers);

// Get supplier by ID
router.get('/suppliers/:id', supplierController.getSupplierById);

// Create new supplier
router.post('/suppliers', supplierController.createSupplier);

// Update supplier
router.put('/suppliers/:id', supplierController.updateSupplier);

// Delete supplier
router.delete('/suppliers/:id', supplierController.deleteSupplier);

module.exports = router; 