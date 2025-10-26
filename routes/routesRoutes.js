const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routesController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Routes endpoints
router.get('/', routesController.getAllRoutes);
router.get('/:id', routesController.getRouteById);
router.post('/', routesController.createRoute);
router.put('/:id', routesController.updateRoute);
router.delete('/:id', routesController.deleteRoute);

module.exports = router;
