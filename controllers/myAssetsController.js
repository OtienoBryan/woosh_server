const connection = require('../database/db');

const myAssetsController = {
  // Get all assets
  getAllAssets: async (req, res) => {
    try {
      const { page = 1, limit = 20, search, asset_type, location } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (ma.asset_code LIKE ? OR ma.asset_name LIKE ? OR ma.asset_type LIKE ? OR ma.location LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (asset_type) {
        whereClause += ' AND ma.asset_type = ?';
        params.push(asset_type);
      }

      if (location) {
        whereClause += ' AND ma.location = ?';
        params.push(location);
      }

      const [assets] = await connection.query(`
        SELECT ma.*, s.company_name as supplier_name
        FROM my_assets ma
        LEFT JOIN suppliers s ON ma.supplier_id = s.id
        ${whereClause}
        ORDER BY ma.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), offset]);

      // Get total count for pagination
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as total
        FROM my_assets ma
        LEFT JOIN suppliers s ON ma.supplier_id = s.id
        ${whereClause}
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: assets,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assets'
      });
    }
  },

  // Get asset by ID
  getAssetById: async (req, res) => {
    try {
      const { id } = req.params;

      const [assets] = await connection.query(`
        SELECT ma.*, s.company_name as supplier_name
        FROM my_assets ma
        LEFT JOIN suppliers s ON ma.supplier_id = s.id
        WHERE ma.id = ?
      `, [id]);

      if (assets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.json({
        success: true,
        data: assets[0]
      });
    } catch (error) {
      console.error('Error fetching asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset'
      });
    }
  },

  // Create new asset
  createAsset: async (req, res) => {
    try {
      console.log('📝 Creating asset with data:', req.body);
      console.log('📁 File upload:', req.file ? 'File present' : 'No file');
      
      const {
        asset_code,
        asset_name,
        asset_type,
        purchase_date,
        location,
        supplier_id,
        price,
        quantity
      } = req.body;

      let document_url = null;
      
      // Handle file upload if present
      if (req.file) {
        console.log('📤 Starting file upload to Cloudinary...');
        try {
          const cloudinary = require('../config/cloudinary');
          const stream = require('stream');
          
          // Create a promise to handle the async upload
          const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'assets',
                resource_type: 'auto'
              },
              (error, result) => {
                if (error) {
                  console.error('❌ Cloudinary upload error:', error);
                  reject(error);
                } else {
                  console.log('✅ File uploaded successfully:', result.secure_url);
                  document_url = result.secure_url;
                  resolve(result);
                }
              }
            );

            const bufferStream = new stream.PassThrough();
            bufferStream.end(req.file.buffer);
            bufferStream.pipe(uploadStream);
          });

          // Wait for upload to complete
          await uploadPromise;
        } catch (uploadError) {
          console.error('❌ File upload error:', uploadError);
          // Continue without the document if upload fails
        }
      } else {
        console.log('📝 No file uploaded, proceeding without document');
      }

      // Validation
      if (!asset_code || !asset_name || !asset_type || !purchase_date || !location || !supplier_id || !price || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required'
        });
      }

      // Check if asset_code already exists
      const [existingAssets] = await connection.query(`
        SELECT id FROM my_assets WHERE asset_code = ?
      `, [asset_code]);

      if (existingAssets.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Asset code already exists'
        });
      }

      // Check if supplier exists
      const [suppliers] = await connection.query(`
        SELECT id FROM suppliers WHERE id = ?
      `, [supplier_id]);

      if (suppliers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      console.log('💾 Inserting asset into database with document_url:', document_url);
      
      // Insert new asset
      const [result] = await connection.query(`
        INSERT INTO my_assets (
          asset_code, asset_name, asset_type, purchase_date, 
          location, supplier_id, price, quantity, document_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        asset_code,
        asset_name,
        asset_type,
        purchase_date,
        location,
        supplier_id,
        price,
        quantity,
        document_url
      ]);

      // Get the created asset with supplier details
      const [createdAssets] = await connection.query(`
        SELECT ma.*, s.company_name as supplier_name
        FROM my_assets ma
        LEFT JOIN suppliers s ON ma.supplier_id = s.id
        WHERE ma.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        data: createdAssets[0],
        message: 'Asset created successfully'
      });
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create asset'
      });
    }
  },

  // Update asset
  updateAsset: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        asset_code,
        asset_name,
        asset_type,
        purchase_date,
        location,
        supplier_id,
        price,
        quantity
      } = req.body;

      // Check if asset exists
      const [existingAssets] = await connection.query(`
        SELECT id FROM my_assets WHERE id = ?
      `, [id]);

      if (existingAssets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      // Check if asset_code already exists (excluding current asset)
      if (asset_code) {
        const [duplicateAssets] = await connection.query(`
          SELECT id FROM my_assets WHERE asset_code = ? AND id != ?
        `, [asset_code, id]);

        if (duplicateAssets.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Asset code already exists'
          });
        }
      }

      // Check if supplier exists
      if (supplier_id) {
        const [suppliers] = await connection.query(`
          SELECT id FROM suppliers WHERE id = ?
        `, [supplier_id]);

        if (suppliers.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Supplier not found'
          });
        }
      }

      // Update asset
      await connection.query(`
        UPDATE my_assets SET
          asset_code = ?,
          asset_name = ?,
          asset_type = ?,
          purchase_date = ?,
          location = ?,
          supplier_id = ?,
          price = ?,
          quantity = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        asset_code,
        asset_name,
        asset_type,
        purchase_date,
        location,
        supplier_id,
        price,
        quantity,
        id
      ]);

      // Get the updated asset
      const [updatedAssets] = await connection.query(`
        SELECT ma.*, s.company_name as supplier_name
        FROM my_assets ma
        LEFT JOIN suppliers s ON ma.supplier_id = s.id
        WHERE ma.id = ?
      `, [id]);

      res.json({
        success: true,
        data: updatedAssets[0],
        message: 'Asset updated successfully'
      });
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update asset'
      });
    }
  },

  // Delete asset
  deleteAsset: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if asset exists
      const [existingAssets] = await connection.query(`
        SELECT id FROM my_assets WHERE id = ?
      `, [id]);

      if (existingAssets.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      // Delete asset
      await connection.query(`
        DELETE FROM my_assets WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'Asset deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete asset'
      });
    }
  },

  // Get asset statistics
  getAssetStats: async (req, res) => {
    try {
      const [stats] = await connection.query(`
        SELECT 
          COUNT(*) as total_assets,
          SUM(quantity) as total_quantity,
          SUM(price * quantity) as total_value,
          COUNT(DISTINCT asset_type) as asset_types,
          COUNT(DISTINCT location) as locations,
          COUNT(DISTINCT supplier_id) as suppliers
        FROM my_assets
      `);

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error fetching asset stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset statistics'
      });
    }
  }
};

module.exports = myAssetsController; 