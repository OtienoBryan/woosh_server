const express = require('express');
const { body } = require('express-validator');
const merchandiseController = require('../controllers/merchandiseController');
const jwt = require('jsonwebtoken');

// Simple JWT auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    // Map userId to id for consistency
    req.user = {
      ...user,
      id: user.userId || user.id
    };
    next();
  });
}

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Validation middleware
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

const validateMerchandise = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Merchandise name must be between 1 and 200 characters'),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
];

const validateStock = [
  body('merchandise_id')
    .isInt({ min: 1 })
    .withMessage('Merchandise ID must be a positive integer'),
  body('store_id')
    .isInt({ min: 1 })
    .withMessage('Store ID must be a positive integer'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
];

const validateBulkStock = [
  body('store_id')
    .isInt({ min: 1 })
    .withMessage('Store ID must be a positive integer'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item must be provided'),
  body('items.*.merchandise_id')
    .isInt({ min: 1 })
    .withMessage('Merchandise ID must be a positive integer'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('items.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Item notes must be less than 500 characters'),
  body('general_notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('General notes must be less than 500 characters')
];

const validateAssignment = [
  body('merchandise_id')
    .isInt({ min: 1 })
    .withMessage('Merchandise ID must be a positive integer'),
  body('staff_id')
    .isInt({ min: 1 })
    .withMessage('Staff ID must be a positive integer'),
  body('quantity_assigned')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('date_assigned')
    .isISO8601()
    .withMessage('Date must be a valid date'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment must be less than 500 characters')
];


// Category routes
router.get('/categories', merchandiseController.getAllCategories);
router.get('/categories/:id', merchandiseController.getCategoryById);
router.post('/categories', validateCategory, merchandiseController.createCategory);
router.put('/categories/:id', validateCategory, merchandiseController.updateCategory);
router.delete('/categories/:id', merchandiseController.deleteCategory);

// Merchandise routes
router.get('/', merchandiseController.getAllMerchandise);
router.get('/:id', merchandiseController.getMerchandiseById);
router.post('/', validateMerchandise, merchandiseController.createMerchandise);
router.put('/:id', validateMerchandise, merchandiseController.updateMerchandise);
router.delete('/:id', merchandiseController.deleteMerchandise);

// Stock routes
router.post('/stock', validateStock, merchandiseController.addStock);
router.post('/stock/bulk', validateBulkStock, merchandiseController.addBulkStock);
router.get('/stock', merchandiseController.getStockHistory);
router.get('/stock/current', merchandiseController.getCurrentStock);
router.get('/ledger', merchandiseController.getLedger);

// Assignment routes
router.get('/assignments', merchandiseController.getAssignments);
router.post('/assignments', validateAssignment, merchandiseController.createAssignment);
router.put('/assignments/:id', validateAssignment, merchandiseController.updateAssignment);
router.delete('/assignments/:id', merchandiseController.deleteAssignment);


module.exports = router;
