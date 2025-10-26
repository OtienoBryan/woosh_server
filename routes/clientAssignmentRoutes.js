const express = require('express');
const router = express.Router();
const clientAssignmentController = require('../controllers/clientAssignmentController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all client assignment routes
router.use(authenticateToken);

// Get all client assignments
router.get('/', clientAssignmentController.getAllClientAssignments);

// Get client assignments by outlet ID
router.get('/outlet/:outletId', clientAssignmentController.getClientAssignmentsByOutlet);

// Get client assignments by sales rep ID
router.get('/sales-rep/:salesRepId', clientAssignmentController.getClientAssignmentsBySalesRep);

// Create new client assignment
router.post('/', clientAssignmentController.createClientAssignment);

// Update client assignment status
router.put('/:id', clientAssignmentController.updateClientAssignment);

// Delete client assignment
router.delete('/:id', clientAssignmentController.deleteClientAssignment);

module.exports = router;
