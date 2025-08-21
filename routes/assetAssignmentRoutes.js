const express = require('express');
const router = express.Router();
const assetAssignmentController = require('../controllers/assetAssignmentController');

// Get all asset assignments
router.get('/', assetAssignmentController.getAll);

// Get asset assignments by asset ID
router.get('/asset/:assetId', assetAssignmentController.getByAssetId);

// Get asset assignments by staff ID
router.get('/staff/:staffId', assetAssignmentController.getByStaffId);

// Create new asset assignment
router.post('/', assetAssignmentController.create);

// Update asset assignment
router.put('/:id', assetAssignmentController.update);

// Return asset (change status to returned)
router.put('/:id/return', assetAssignmentController.returnAsset);

// Delete asset assignment
router.delete('/:id', assetAssignmentController.delete);

module.exports = router;
