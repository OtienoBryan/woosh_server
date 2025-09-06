const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routesController');

// Authentication middleware (you may need to adjust this based on your auth setup)
const authenticateToken = (req, res, next) => {
  // Add your authentication logic here
  // For now, we'll skip authentication for development
  next();
};

// Apply authentication to all routes
router.use(authenticateToken);

// Routes endpoints
router.get('/', routesController.getAllRoutes);
router.get('/:id', routesController.getRouteById);
router.post('/', routesController.createRoute);
router.put('/:id', routesController.updateRoute);
router.delete('/:id', routesController.deleteRoute);

module.exports = router;
