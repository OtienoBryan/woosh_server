const connection = require('../database/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// Configure multer for file uploads (memory storage for Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed!'));
    }
  }
}).single('document');

const receiptController = {
  // Post a new receipt
  postReceipt: async (req, res) => {
    upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: 'File upload error: ' + err.message
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      try {
        const { supplier_id, comment, receipt_date } = req.body;
        const file = req.file;

        // Validate required fields
        if (!supplier_id) {
          return res.status(400).json({
            success: false,
            error: 'Supplier is required'
          });
        }

        if (!receipt_date) {
          return res.status(400).json({
            success: false,
            error: 'Receipt date is required'
          });
        }

        if (!file) {
          return res.status(400).json({
            success: false,
            error: 'Document upload is required'
          });
        }

        // Verify supplier exists
        const [suppliers] = await connection.query(`
          SELECT id FROM suppliers WHERE id = ?
        `, [supplier_id]);

        if (suppliers.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid supplier selected'
          });
        }

        // Upload file to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'receipts',
              resource_type: 'auto',
              allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
              transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          // Convert buffer to stream and upload
          const stream = require('stream');
          const bufferStream = new stream.PassThrough();
          bufferStream.end(file.buffer);
          bufferStream.pipe(uploadStream);
        });

        // Insert receipt into database
        const [result] = await connection.query(`
          INSERT INTO my_receipts (
            supplier_id, 
            comment, 
            receipt_date, 
            document_path, 
            original_filename,
            file_size,
            created_by,
            created_at, 
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          supplier_id,
          comment || null,
          receipt_date,
          uploadResult.secure_url,
          file.originalname,
          file.size,
          req.user?.id || 1 // Default to user ID 1 if not authenticated
        ]);

        // Get the created receipt with supplier and user details
        const [receipts] = await connection.query(`
          SELECT r.*, s.company_name as supplier_name, s.contact_person as supplier_contact, s.email as supplier_email,
                 u.username as uploaded_by_name, u.email as uploaded_by_email
          FROM my_receipts r
          JOIN suppliers s ON r.supplier_id = s.id
          LEFT JOIN users u ON r.created_by = u.id
          WHERE r.id = ?
        `, [result.insertId]);

        res.status(201).json({
          success: true,
          data: receipts[0],
          message: 'Receipt posted successfully'
        });

      } catch (error) {
        console.error('Error posting receipt:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to post receipt'
        });
      }
    });
  },

  // Get all receipts
  getAllReceipts: async (req, res) => {
    try {
      const { page = 1, limit = 20, supplier_id, date_from, date_to } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (supplier_id) {
        whereClause += ' AND r.supplier_id = ?';
        params.push(supplier_id);
      }

      if (date_from) {
        whereClause += ' AND r.receipt_date >= ?';
        params.push(date_from);
      }

      if (date_to) {
        whereClause += ' AND r.receipt_date <= ?';
        params.push(date_to);
      }

      const [receipts] = await connection.query(`
        SELECT r.*, s.company_name as supplier_name, s.contact_person as supplier_contact, s.email as supplier_email,
               u.username as uploaded_by_name, u.email as uploaded_by_email
        FROM my_receipts r
        JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN users u ON r.created_by = u.id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]);

      // Get total count for pagination
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as total
        FROM my_receipts r
        JOIN suppliers s ON r.supplier_id = s.id
        ${whereClause}
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: receipts,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch receipts'
      });
    }
  },

  // Get receipt by ID
  getReceiptById: async (req, res) => {
    try {
      const { id } = req.params;

      const [receipts] = await connection.query(`
        SELECT r.*, s.company_name as supplier_name, s.contact_person as supplier_contact, s.email as supplier_email,
               u.username as uploaded_by_name, u.email as uploaded_by_email
        FROM my_receipts r
        JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?
      `, [id]);

      if (receipts.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      res.json({
        success: true,
        data: receipts[0]
      });
    } catch (error) {
      console.error('Error fetching receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch receipt'
      });
    }
  },

  // Download receipt document
  downloadReceipt: async (req, res) => {
    try {
      const { id } = req.params;

      const [receipts] = await connection.query(`
        SELECT document_path, original_filename
        FROM my_receipts
        WHERE id = ?
      `, [id]);

      if (receipts.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      const receipt = receipts[0];
      const cloudinaryUrl = receipt.document_path;

      // Redirect to Cloudinary URL for direct access
      res.redirect(cloudinaryUrl);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download receipt'
      });
    }
  },

  // Delete receipt
  deleteReceipt: async (req, res) => {
    try {
      const { id } = req.params;

      // Get receipt details first
      const [receipts] = await connection.query(`
        SELECT document_path FROM my_receipts WHERE id = ?
      `, [id]);

      if (receipts.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      const receipt = receipts[0];

      // Delete from database
      const [result] = await connection.query(`
        DELETE FROM my_receipts WHERE id = ?
      `, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      // Delete file from Cloudinary if it's a Cloudinary URL
      if (receipt.document_path && receipt.document_path.includes('cloudinary.com')) {
        try {
          // Extract public_id from Cloudinary URL
          const urlParts = receipt.document_path.split('/');
          const publicId = urlParts[urlParts.length - 1].split('.')[0];
          const folder = 'receipts';
          const fullPublicId = `${folder}/${publicId}`;
          
          await cloudinary.uploader.destroy(fullPublicId);
        } catch (cloudinaryError) {
          console.error('Error deleting from Cloudinary:', cloudinaryError);
          // Continue even if Cloudinary deletion fails
        }
      }

      res.json({
        success: true,
        message: 'Receipt deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete receipt'
      });
    }
  }
};

module.exports = receiptController; 