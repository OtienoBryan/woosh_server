const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');

// Get tasks with month filter
router.get('/', tasksController.getTasks);

// Get all tasks (without month filter)
router.get('/all', tasksController.getAllTasks);

// Create a new task
router.post('/', tasksController.addTask);

// Update a task
router.put('/:id', tasksController.updateTask);

// Delete a task
router.delete('/:id', tasksController.deleteTask);

module.exports = router;
