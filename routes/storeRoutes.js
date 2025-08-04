const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');

// Store CRUD routes
router.get('/', storeController.getAllStores);
router.get('/:id', storeController.getStoreById);
router.post('/', storeController.createStore);
router.put('/:id', storeController.updateStore);
router.delete('/:id', storeController.deleteStore);

// Inventory routes
router.get('/:storeId/inventory', storeController.getStoreInventory);
router.get('/inventory/all', storeController.getAllStoresInventory);
router.get('/inventory/summary', storeController.getInventorySummaryByStore);
router.get('/inventory/transactions', storeController.getInventoryTransactions);
router.get('/inventory/as-of', storeController.getInventoryAsOfDate);

// Stock transfer routes
router.post('/stock-transfer', storeController.recordStockTransfer);
router.get('/stock-transfer/history', storeController.getTransferHistory);

// Stock take routes
router.post('/stock-take', storeController.recordStockTake);
router.get('/stock-take/history', storeController.getStockTakeHistory);
router.get('/stock-take/:stock_take_id/items', storeController.getStockTakeItems);

// Stock quantity update route
router.post('/update-stock-quantity', storeController.updateStockQuantity);

module.exports = router; 