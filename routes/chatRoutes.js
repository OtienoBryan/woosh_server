const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// Apply auth middleware to all chat routes
router.use(authenticateToken);

// Create a chat room
router.post('/rooms', chatController.createRoom);
// Add a member to a room
router.post('/rooms/:roomId/members', chatController.addMember);
// Remove a member from a room
router.delete('/rooms/:roomId/members', chatController.removeMember);
// Send a message to a room
router.post('/rooms/:roomId/messages', chatController.sendMessage);
// Get messages for a room
router.get('/rooms/:roomId/messages', chatController.getMessages);
// List chat rooms for the authenticated user
router.get('/my-rooms', chatController.getRoomsForUser);
// Get latest message timestamp for authenticated user
router.get('/latest', chatController.getLatestForUser);
// Edit a message
router.patch('/messages/:id', chatController.editMessage);
// Delete a message
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router; 