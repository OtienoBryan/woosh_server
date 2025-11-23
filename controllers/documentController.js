const db = require('../database/db');
const path = require('path');
const fs = require('fs');
// Uncomment if using cloudinary
const cloudinary = require('../config/cloudinary');

const documentController = {
  uploadDocument: async (req, res) => {
    try {
      console.log('📤 Document upload request received');
      console.log('📤 Request body:', req.body);
      console.log('📤 Request file:', req.file ? 'File present' : 'No file');
      
      const { title, category, description, start_date, end_date, parent_folder_id } = req.body;
      if (!title || !category || !req.file) {
        console.log('❌ Missing required fields:', { title: !!title, category: !!category, file: !!req.file });
        return res.status(400).json({ message: 'Title, category, and file are required.' });
      }
      
      const { originalname, buffer, mimetype } = req.file;
      console.log('📤 Uploading document:', { title, category, originalname, mimetype, bufferSize: buffer.length });
      
      // Check if Cloudinary is properly configured
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const fileStorageType = process.env.FILE_STORAGE_TYPE || 'cloudinary';
      
      console.log('🔧 Environment check:', {
        cloudName: !!cloudName,
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
        fileStorageType
      });
      
      let fileUrl;
      
      if (fileStorageType === 'local' || !cloudName || !apiKey || !apiSecret) {
        // Use local file storage
        console.log('Using local file storage for document...');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/documents');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `doc_${timestamp}_${sanitizedName}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Save file locally
        fs.writeFileSync(filePath, buffer);
        
        // Create URL for local file
        fileUrl = `/uploads/documents/${filename}`;
        console.log('Local document saved:', filePath);
      } else {
        // Use Cloudinary with buffer
        console.log('Using Cloudinary upload for document...');
        const stream = require('stream');
        
        // Create a promise to handle the async upload
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'documents',
              resource_type: 'auto',
              public_id: `${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
            },
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('✅ File uploaded successfully:', result.secure_url);
                fileUrl = result.secure_url;
                resolve(result);
              }
            }
          );

          const bufferStream = new stream.PassThrough();
          bufferStream.end(buffer);
          bufferStream.pipe(uploadStream);
        });

        // Wait for upload to complete
        await uploadPromise;
      }
      
      // Save metadata to DB
      console.log('💾 Saving to database:', { title, category, fileUrl, description, start_date, end_date });
      
      // Convert date strings to proper date format (YYYY-MM-DD) or null
      const startDateValue = start_date && start_date.trim() !== '' ? start_date : null;
      const endDateValue = end_date && end_date.trim() !== '' ? end_date : null;
      
      const parentFolderId = parent_folder_id && parent_folder_id !== '' && parent_folder_id !== 'null' ? parseInt(parent_folder_id) : null;
      
      await db.query(
        'INSERT INTO documents (title, category, file_url, description, start_date, end_date, parent_folder_id, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [title, category, fileUrl, description || null, startDateValue, endDateValue, parentFolderId]
      );
      
      console.log('✅ Document saved to database successfully');
      res.status(201).json({ message: 'Document uploaded successfully', file_url: fileUrl });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ message: 'Failed to upload document', error: error.message });
    }
  },
  getAllDocuments: async (req, res) => {
    try {
      const { parent_folder_id } = req.query;
      let query = 'SELECT id, title, category, file_url, description, start_date, end_date, parent_folder_id, uploaded_at FROM documents';
      let params = [];
      
      if (parent_folder_id !== undefined) {
        if (parent_folder_id === null || parent_folder_id === 'null' || parent_folder_id === '') {
          query += ' WHERE parent_folder_id IS NULL';
        } else {
          query += ' WHERE parent_folder_id = ?';
          params.push(parseInt(parent_folder_id));
        }
      }
      
      query += ' ORDER BY uploaded_at DESC';
      
      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
    }
  },

  deleteDocument: async (req, res) => {
    try {
      const { id } = req.params;
      
      // First, get the document to retrieve the file URL for cleanup
      const [rows] = await db.query('SELECT file_url FROM documents WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const document = rows[0];
      
      // Delete from database
      await db.query('DELETE FROM documents WHERE id = ?', [id]);
      
      // Optional: Delete from Cloudinary (uncomment if you want to remove files from cloud storage)
      // try {
      //   const publicId = document.file_url.split('/').pop().split('.')[0];
      //   await cloudinary.uploader.destroy(`documents/${publicId}`);
      // } catch (cloudinaryError) {
      //   console.warn('Failed to delete file from Cloudinary:', cloudinaryError.message);
      // }
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete document', error: error.message });
    }
  },

  // Category Management Functions
  getAllCategories: async (req, res) => {
    try {
      const [categories] = await db.query(
        'SELECT * FROM document_categories WHERE is_active = TRUE ORDER BY name ASC'
      );
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
    }
  },

  createCategory: async (req, res) => {
    try {
      const { name, description, color } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }

      const [result] = await db.query(
        'INSERT INTO document_categories (name, description, color) VALUES (?, ?, ?)',
        [name, description || null, color || '#3B82F6']
      );

      const [newCategory] = await db.query(
        'SELECT * FROM document_categories WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json(newCategory[0]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ message: 'Category name already exists' });
      } else {
        res.status(500).json({ message: 'Failed to create category', error: error.message });
      }
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, is_active } = req.body;

      const [result] = await db.query(
        'UPDATE document_categories SET name = ?, description = ?, color = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [name, description, color, is_active !== undefined ? is_active : true, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const [updatedCategory] = await db.query(
        'SELECT * FROM document_categories WHERE id = ?',
        [id]
      );

      res.json(updatedCategory[0]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ message: 'Category name already exists' });
      } else {
        res.status(500).json({ message: 'Failed to update category', error: error.message });
      }
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if category is being used by any documents
      const [documents] = await db.query(
        'SELECT COUNT(*) as count FROM documents WHERE category_id = ?',
        [id]
      );

      if (documents[0].count > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete category that is being used by documents. Please reassign documents first.' 
        });
      }

      const [result] = await db.query(
        'DELETE FROM document_categories WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete category', error: error.message });
    }
  },

  // Folder Management Functions
  getAllFolders: async (req, res) => {
    try {
      const { parent_folder_id } = req.query;
      let query = 'SELECT id, name, parent_folder_id, created_at, updated_at FROM document_folders';
      let params = [];
      
      if (parent_folder_id !== undefined) {
        if (parent_folder_id === null || parent_folder_id === 'null' || parent_folder_id === '') {
          query += ' WHERE parent_folder_id IS NULL';
        } else {
          query += ' WHERE parent_folder_id = ?';
          params.push(parseInt(parent_folder_id));
        }
      }
      
      query += ' ORDER BY name ASC';
      
      const [rows] = await db.query(query, params);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch folders', error: error.message });
    }
  },

  getFolderById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query(
        'SELECT id, name, parent_folder_id, created_at, updated_at FROM document_folders WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Folder not found' });
      }
      
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch folder', error: error.message });
    }
  },

  createFolder: async (req, res) => {
    try {
      const { name, parent_folder_id } = req.body;
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Folder name is required' });
      }

      const parentFolderId = parent_folder_id && parent_folder_id !== '' && parent_folder_id !== 'null' ? parseInt(parent_folder_id) : null;
      
      // Check if parent folder exists (if provided)
      if (parentFolderId) {
        const [parentFolders] = await db.query(
          'SELECT id FROM document_folders WHERE id = ?',
          [parentFolderId]
        );
        if (parentFolders.length === 0) {
          return res.status(404).json({ message: 'Parent folder not found' });
        }
      }

      const [result] = await db.query(
        'INSERT INTO document_folders (name, parent_folder_id) VALUES (?, ?)',
        [name.trim(), parentFolderId]
      );

      const [newFolder] = await db.query(
        'SELECT * FROM document_folders WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json(newFolder[0]);
    } catch (error) {
      console.error('Error creating folder:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ message: 'Folder name already exists in this location' });
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        res.status(500).json({ 
          message: 'Database table not found. Please run the migration script: server/database/add_folders_support.sql',
          error: error.message 
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to create folder', 
          error: error.message,
          code: error.code 
        });
      }
    }
  },

  updateFolder: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, parent_folder_id } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Folder name is required' });
      }

      const parentFolderId = parent_folder_id && parent_folder_id !== '' && parent_folder_id !== 'null' ? parseInt(parent_folder_id) : null;
      
      // Prevent moving folder into itself or its descendants
      if (parentFolderId && parseInt(id) === parentFolderId) {
        return res.status(400).json({ message: 'Cannot move folder into itself' });
      }

      // Check if parent folder exists (if provided)
      if (parentFolderId) {
        const [parentFolders] = await db.query(
          'SELECT id FROM document_folders WHERE id = ?',
          [parentFolderId]
        );
        if (parentFolders.length === 0) {
          return res.status(404).json({ message: 'Parent folder not found' });
        }
      }

      const [result] = await db.query(
        'UPDATE document_folders SET name = ?, parent_folder_id = ?, updated_at = NOW() WHERE id = ?',
        [name.trim(), parentFolderId, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      const [updatedFolder] = await db.query(
        'SELECT * FROM document_folders WHERE id = ?',
        [id]
      );

      res.json(updatedFolder[0]);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update folder', error: error.message });
    }
  },

  deleteFolder: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if folder has subfolders or documents
      const [subfolders] = await db.query(
        'SELECT COUNT(*) as count FROM document_folders WHERE parent_folder_id = ?',
        [id]
      );

      const [documents] = await db.query(
        'SELECT COUNT(*) as count FROM documents WHERE parent_folder_id = ?',
        [id]
      );

      if (subfolders[0].count > 0 || documents[0].count > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete folder that contains subfolders or documents. Please remove them first.' 
        });
      }

      const [result] = await db.query(
        'DELETE FROM document_folders WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete folder', error: error.message });
    }
  },

  runFolderMigration: async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Read the migration SQL file
      const migrationPath = path.join(__dirname, '..', 'database', 'add_folders_support.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      const results = [];
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            await db.query(statement);
            results.push({ 
              statement: i + 1, 
              status: 'success', 
              message: 'Executed successfully' 
            });
          } catch (error) {
            // Some errors are expected (like table/column already exists)
            if (error.code === 'ER_DUP_FIELDNAME' || 
                error.code === 'ER_DUP_KEYNAME' || 
                error.code === 'ER_DUP_KEY' ||
                error.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
                error.message.includes('Duplicate column name') ||
                error.message.includes('already exists')) {
              results.push({ 
                statement: i + 1, 
                status: 'skipped', 
                message: 'Already exists: ' + error.message 
              });
            } else {
              throw error;
            }
          }
        }
      }

      // Verify the table was created
      const [tables] = await db.query("SHOW TABLES LIKE 'document_folders'");
      const tableExists = tables.length > 0;

      res.json({ 
        message: 'Migration completed successfully',
        results,
        tableExists,
        statementsExecuted: results.length
      });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ 
        message: 'Migration failed', 
        error: error.message,
        code: error.code 
      });
    }
  },
};

module.exports = documentController; 