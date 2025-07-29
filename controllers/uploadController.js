const cloudinary = require('../config/cloudinary');

const uploadController = {
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(req.file.buffer).toString('base64');
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