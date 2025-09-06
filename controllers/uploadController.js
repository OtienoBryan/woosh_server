const cloudinary = require('../config/cloudinary');
const fs = require('fs');

const uploadController = {
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      let buffer;
      
      // Handle both memory storage and disk storage
      if (req.file.buffer) {
        // Memory storage - buffer is available
        buffer = req.file.buffer;
      } else if (req.file.path) {
        // Disk storage - read file from disk
        buffer = fs.readFileSync(req.file.path);
        // Clean up the temporary file
        fs.unlinkSync(req.file.path);
      } else {
        return res.status(400).json({ message: 'Invalid file data' });
      }

      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'uploads',
        resource_type: 'auto',
      });

      res.json({
        url: result.secure_url,
        public_id: result.public_id
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Error uploading image' });
    }
  }
};

module.exports = uploadController; 