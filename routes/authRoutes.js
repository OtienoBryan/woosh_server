const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Login route (public)
router.post('/login', authController.login);

// Logout route (protected)
router.post('/logout', authenticateToken, authController.logout);

module.exports = router; 