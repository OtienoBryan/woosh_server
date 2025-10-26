const express = require('express');
const router = express.Router();
const calendarTaskController = require('../controllers/calendarTaskController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all calendar task routes
router.use(authenticateToken);

router.get('/', calendarTaskController.getTasks);
router.post('/', calendarTaskController.addTask);
router.put('/:id', calendarTaskController.updateTask);
router.delete('/:id', calendarTaskController.deleteTask);

module.exports = router; 