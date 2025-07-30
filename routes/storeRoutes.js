const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');

// Get all stores
router.get('/', storeController.getAllStores);

// Get store by ID
router.get('/:id', storeController.getStoreById);

// Create new store
router.post('/', storeController.createStore);

// Update store
router.put('/:id', storeController.updateStore);

// Delete store
router.delete('/:id', storeController.deleteStore);

module.exports = router; 