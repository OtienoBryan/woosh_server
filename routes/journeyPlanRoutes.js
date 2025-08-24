const express = require('express');
const router = express.Router();
const journeyPlanController = require('../controllers/journeyPlanController');

// Get all journey plans
router.get('/', journeyPlanController.getAllJourneyPlans);

// Get journey plans by user ID
router.get('/user/:userId', journeyPlanController.getJourneyPlansByUser);

// Get journey plan by ID
router.get('/:id', journeyPlanController.getJourneyPlan);

// Create new journey plan
router.post('/', journeyPlanController.createJourneyPlan);

// Update journey plan
router.put('/:id', journeyPlanController.updateJourneyPlan);

// Delete journey plan
router.delete('/:id', journeyPlanController.deleteJourneyPlan);

// Check in to journey plan
router.post('/:id/checkin', journeyPlanController.checkIn);

// Check out from journey plan
router.post('/:id/checkout', journeyPlanController.checkOut);

module.exports = router; 