const express = require('express');
const router = express.Router();
const calendarTaskController = require('../controllers/calendarTaskController');

router.get('/', calendarTaskController.getTasks);
router.post('/', calendarTaskController.addTask);
router.put('/:id', calendarTaskController.updateTask);
router.delete('/:id', calendarTaskController.deleteTask);

module.exports = router; 