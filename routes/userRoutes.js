const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all user routes
router.use(authenticateToken);

router.put('/:id/password', userController.changePassword);
router.post('/:id/avatar', userController.uploadAvatarMiddleware, userController.uploadAvatar);
router.get('/:id', userController.getUserById);

module.exports = router; 