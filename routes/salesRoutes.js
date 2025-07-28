const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// Dropdown endpoints
router.get('/countries', salesController.getAllCountries);
router.get('/regions', salesController.getAllRegions);
router.get('/routes', salesController.getAllRoutes);

// Add endpoints for adding country, region, and route
router.post('/countries', salesController.addCountry);
router.post('/regions', salesController.addRegion);
router.post('/routes', salesController.addRoute);

// Upload sales rep photo
router.post('/sales-reps/upload-photo', salesController.uploadSalesRepPhoto);

// Get all sales reps
router.get('/sales-reps', salesController.getAllSalesReps);

// Create a new sales rep
router.post('/sales-reps', salesController.createSalesRep);

// Update a sales rep
router.put('/sales-reps/:id', salesController.updateSalesRep);

// Update status of a sales rep
router.patch('/sales-reps/:id/status', salesController.updateSalesRepStatus);

// Delete a sales rep
router.delete('/sales-reps/:id', salesController.deleteSalesRep);

// Assign/unassign managers to sales rep
router.get('/sales-reps/:id/managers', salesController.getSalesRepManagers);
router.post('/sales-reps/:id/managers', salesController.assignManagersToSalesRep);
router.delete('/sales-reps/:id/managers/:managerId', salesController.unassignManagerFromSalesRep);

// Get a single sales rep by ID
router.get('/sales-reps/:id', salesController.getSalesRepById);

// Key account targets for sales rep
router.get('/sales-reps/:id/key-account-targets', salesController.getKeyAccountTargets);
router.post('/sales-reps/:id/key-account-targets', salesController.addKeyAccountTargets);
router.put('/sales-reps/:id/key-account-targets/:targetId', salesController.updateKeyAccountTarget);
router.delete('/sales-reps/:id/key-account-targets/:targetId', salesController.deleteKeyAccountTarget);

// Retail targets for sales rep
router.get('/sales-reps/:id/retail-targets', salesController.getRetailTargets);
router.post('/sales-reps/:id/retail-targets', salesController.addRetailTargets);
router.put('/sales-reps/:id/retail-targets/:targetId', salesController.updateRetailTarget);
router.delete('/sales-reps/:id/retail-targets/:targetId', salesController.deleteRetailTarget);

// Distributors targets for sales rep
router.get('/sales-reps/:id/distributors-targets', salesController.getDistributorsTargets);
router.post('/sales-reps/:id/distributors-targets', salesController.addDistributorsTargets);
router.put('/sales-reps/:id/distributors-targets/:targetId', salesController.updateDistributorsTarget);
router.delete('/sales-reps/:id/distributors-targets/:targetId', salesController.deleteDistributorsTarget);

// Manager assignments for sales rep
router.get('/sales-reps/:id/manager-assignments', salesController.getManagerAssignments);
router.post('/sales-reps/:id/manager-assignments', salesController.setManagerAssignments);

// Get sales rep performance data
router.get('/performance', salesController.getSalesRepPerformance);

module.exports = router; 