const express = require('express');
const router = express.Router();
const assetPurchaseOrderController = require('../controllers/assetPurchaseOrderController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all asset purchase orders
router.get('/', assetPurchaseOrderController.getAllAssetPurchaseOrders);

// Get asset purchase order by ID
router.get('/:id', assetPurchaseOrderController.getAssetPurchaseOrderById);

// Create new asset purchase order
router.post('/', assetPurchaseOrderController.createAssetPurchaseOrder);

// Update status
router.patch('/:id/status', assetPurchaseOrderController.updateStatus);

// Receive assets (process the purchase order)
router.post('/:assetPurchaseOrderId/receive', assetPurchaseOrderController.receiveAssets);

module.exports = router;

