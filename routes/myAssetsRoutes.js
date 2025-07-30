const express = require('express');
const router = express.Router();
const multer = require('multer');
const myAssetsController = require('../controllers/myAssetsController');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and Word documents
    if (file.mimetype.startsWith('image/') || 
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'), false);
    }
  }
});

// Get all assets with pagination and filtering
router.get('/', myAssetsController.getAllAssets);

// Get asset by ID
router.get('/:id', myAssetsController.getAssetById);

// Create new asset
router.post('/', upload.single('document'), myAssetsController.createAsset);

// Update asset
router.put('/:id', myAssetsController.updateAsset);

// Delete asset
router.delete('/:id', myAssetsController.deleteAsset);

// Get asset statistics
router.get('/stats/overview', myAssetsController.getAssetStats);

module.exports = router; 