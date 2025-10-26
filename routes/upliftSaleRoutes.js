const express = require('express');
const router = express.Router();
const upliftSaleController = require('../controllers/upliftSaleController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/uplift-sales - Get all uplift sales with pagination and filters
router.get('/', upliftSaleController.getUpliftSales);

// GET /api/uplift-sales/summary - Get uplift sales summary/statistics
router.get('/summary', upliftSaleController.getUpliftSalesSummary);

// GET /api/uplift-sales/outlet-accounts - Get outlet accounts
router.get('/outlet-accounts', upliftSaleController.getOutletAccounts);

// GET /api/uplift-sales/sales-reps - Get sales reps
router.get('/sales-reps', upliftSaleController.getSalesReps);

// GET /api/uplift-sales/debug - Debug endpoint to check database state
router.get('/debug', upliftSaleController.debugUpliftData);

// Uplift Sale Items routes (must come before /:id routes)
// GET /api/uplift-sales/:upliftSaleId/items - Get uplift sale items
router.get('/:upliftSaleId/items', upliftSaleController.getUpliftSaleItems);

// POST /api/uplift-sales/:upliftSaleId/items - Create uplift sale item
router.post('/:upliftSaleId/items', upliftSaleController.createUpliftSaleItem);

// PUT /api/uplift-sales/:upliftSaleId/items/:itemId - Update uplift sale item
router.put('/:upliftSaleId/items/:itemId', upliftSaleController.updateUpliftSaleItem);

// DELETE /api/uplift-sales/:upliftSaleId/items/:itemId - Delete uplift sale item
router.delete('/:upliftSaleId/items/:itemId', upliftSaleController.deleteUpliftSaleItem);

// GET /api/uplift-sales/:id - Get a single uplift sale by ID
router.get('/:id', upliftSaleController.getUpliftSale);

// POST /api/uplift-sales - Create a new uplift sale
router.post('/', upliftSaleController.createUpliftSale);

// PUT /api/uplift-sales/:id - Update an uplift sale
router.put('/:id', upliftSaleController.updateUpliftSale);

// DELETE /api/uplift-sales/:id - Delete an uplift sale
router.delete('/:id', upliftSaleController.deleteUpliftSale);

module.exports = router;
