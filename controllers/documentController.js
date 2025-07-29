const db = require('../database/db');
const path = require('path');
const fs = require('fs');
// Uncomment if using cloudinary
const cloudinary = require('../config/cloudinary');

const documentController = {
  uploadDocument: async (req, res) => {
    try {
      const { title, category, description } = req.body;
      if (!title || !category || !req.file) {
        return res.status(400).json({ message: 'Title, category, and file are required.' });
      }
      const { originalname, path: filePath } = req.file;
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'auto',
        folder: 'documents',
        public_id: `${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      const fileUrl = result.secure_url;
      // Save metadata to DB
      await db.query(
        'INSERT INTO documents (title, category, file_url, description, uploaded_at) VALUES (?, ?, ?, ?, NOW())',
        [title, category, fileUrl, description || null]
      );
      // Delete local file

      res.status(201).json({ message: 'Document uploaded', file_url: fileUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload document', error: error.message });
    }
  },
  getAllDocuments: async (req, res) => {
    try {
      const [rows] = await db.query('SELECT id, title, category, file_url, description, uploaded_at FROM documents ORDER BY uploaded_at DESC');
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
    }
  },
};

module.exports = documentController; 