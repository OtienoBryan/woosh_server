const db = require('../database/db');

const chatController = {
  // Create a chat room (group or private)
  createRoom: async (req, res) => {
    const { name, is_group, memberIds } = req.body;
    const created_by = req.user.userId;
    try {
      // Create the room
      const [result] = await db.query(
        'INSERT INTO chat_rooms (name, is_group, created_by) VALUES (?, ?, ?)',
        [name || null, !!is_group, created_by]
      );
      const roomId = result.insertId;
      // Add members (including creator)
      const allMembers = Array.from(new Set([created_by, ...(memberIds || [])]));
      await Promise.all(
        allMembers.map(staff_id =>
          db.query('INSERT INTO chat_room_members (room_id, staff_id) VALUES (?, ?)', [roomId, staff_id])
        )
      );
      res.status(201).json({ roomId });
    } catch (error) {
        console.error('Create Room Error:', error);
      res.status(500).json({ message: 'Failed to create chat room', error: error.message });
    }
  },

  // Add a member to a room
  addMember: async (req, res) => {
    const { roomId, staffId } = req.body;
    try {
      await db.query('INSERT INTO chat_room_members (room_id, staff_id) VALUES (?, ?)', [roomId, staffId]);
      res.json({ message: 'Member added' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add member', error: error.message });
    }
  },

  // Remove a member from a room
  removeMember: async (req, res) => {
    const { roomId, staffId } = req.body;
    try {
      await db.query('DELETE FROM chat_room_members WHERE room_id = ? AND staff_id = ?', [roomId, staffId]);
      res.json({ message: 'Member removed' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove member', error: error.message });
    }
  },

  // Send a message to a room
  sendMessage: async (req, res) => {
    const { roomId, message } = req.body;
    const sender_id = req.user.userId;
    try {
      const [result] = await db.query(
        'INSERT INTO chat_messages (room_id, sender_id, message) VALUES (?, ?, ?)',
        [roomId, sender_id, message]
      );
      res.status(201).json({ messageId: result.insertId });
    } catch (error) {
      res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
  },

  // Fetch messages for a room
  getMessages: async (req, res) => {
    const { roomId } = req.params;
    try {
      const [messages] = await db.query(
        `SELECT m.*, s.name as sender_name FROM chat_messages m JOIN staff s ON m.sender_id = s.id WHERE m.room_id = ? ORDER BY m.sent_at ASC`,
        [roomId]
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
    }
  },

  // Edit a message
  editMessage: async (req, res) => {
    const messageId = req.params.id;
    const { message } = req.body;
    const userId = req.user.userId;
    try {
      // Only allow editing own message
      const [[msg]] = await db.query('SELECT * FROM chat_messages WHERE id = ?', [messageId]);
      if (!msg) return res.status(404).json({ message: 'Message not found' });
      if (msg.sender_id !== userId) return res.status(403).json({ message: 'Not allowed' });
      await db.query('UPDATE chat_messages SET message = ? WHERE id = ?', [message, messageId]);
      res.json({ message: 'Message updated' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to edit message', error: error.message });
    }
  },

  // Delete a message
  deleteMessage: async (req, res) => {
    const messageId = req.params.id;
    const userId = req.user.userId;
    try {
      // Only allow deleting own message
      const [[msg]] = await db.query('SELECT * FROM chat_messages WHERE id = ?', [messageId]);
      if (!msg) return res.status(404).json({ message: 'Message not found' });
      if (msg.sender_id !== userId) return res.status(403).json({ message: 'Not allowed' });
      await db.query('DELETE FROM chat_messages WHERE id = ?', [messageId]);
      res.json({ message: 'Message deleted' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete message', error: error.message });
    }
  },

  // List chat rooms for a user
  getRoomsForUser: async (req, res) => {
    const userId = req.user.userId;
    try {
      const [rooms] = await db.query(
        `SELECT r.* FROM chat_rooms r
         JOIN chat_room_members m ON r.id = m.room_id
         WHERE m.staff_id = ?
         ORDER BY r.created_at DESC`,
        [userId]
      );
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch chat rooms', error: error.message });
    }
  },

  // Latest message timestamp across all rooms the user belongs to
  getLatestForUser: async (req, res) => {
    const userId = req.user.userId;
    try {
      const [[row]] = await db.query(
        `SELECT MAX(m.sent_at) AS last_message_at
         FROM chat_messages m
         INNER JOIN chat_room_members mem ON mem.room_id = m.room_id
         WHERE mem.staff_id = ?`,
        [userId]
      );
      res.json({ success: true, last_message_at: row?.last_message_at || null });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch latest chat info', error: error.message });
    }
  }
};

module.exports = chatController; 