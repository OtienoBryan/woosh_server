const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');

// Post a new receipt
router.post('/receipts', receiptController.postReceipt);

// Get all receipts
router.get('/receipts', receiptController.getAllReceipts);

// Get receipt by ID
router.get('/receipts/:id', receiptController.getReceiptById);

// Download receipt document
router.get('/receipts/:id/download', receiptController.downloadReceipt);

// Delete receipt
router.delete('/receipts/:id', receiptController.deleteReceipt);

module.exports = router; 