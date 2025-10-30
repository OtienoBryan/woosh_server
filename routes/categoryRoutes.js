const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get category statistics
router.get('/stats', categoryController.getCategoryStats);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Get products by category
router.get('/:id/products', categoryController.getProductsByCategory);

// Create new category (admin only)
router.post('/', categoryController.createCategory);

// Update category (admin only)
router.put('/:id', categoryController.updateCategory);

// Delete category (admin only)
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;

