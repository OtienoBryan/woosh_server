const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const jwt = require('jsonwebtoken');

// Simple JWT auth middleware with logging
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('Authorization header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  console.log('JWT token:', token);
  if (!token) {
    console.log('No token provided');
    return res.sendStatus(401);
  }
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log('JWT error:', err);
      return res.sendStatus(403);
    }
    console.log('Decoded user:', user);
    req.user = user;
    next();
  });
}

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