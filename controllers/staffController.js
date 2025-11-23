const db = require('../database/db');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const staffController = {
  getAllStaff: async (req, res) => {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      if (activeOnly) {
        // Return only active staff with id and name
        const [staff] = await db.query('SELECT id, name FROM staff WHERE is_active = TRUE ORDER BY name');
        return res.json(staff);
      }
      // First, check if the staff table exists
      const [tables] = await db.query('SHOW TABLES LIKE "staff"');
      if (tables.length === 0) {
        return res.status(500).json({ message: 'Staff table does not exist', error: 'Database table missing' });
      }
      const [columns] = await db.query('DESCRIBE staff');
      const [staff] = await db.query(`
        SELECT s.*, md.name as department_name, md.description as department_description
        FROM staff s 
        LEFT JOIN my_departments md ON s.department_id = md.id 
        ORDER BY s.created_at DESC
      `);
      if (!staff || staff.length === 0) {
        return res.json([]);
      }
      
      // Map is_active to status for frontend compatibility
      const staffWithStatus = staff.map(member => ({
        ...member,
        status: member.is_active ? 1 : 0
      }));
      
      res.json(staffWithStatus);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching staff list', error: error.message });
    }
  },
  uploadAvatar: async (req, res) => {
    const staffId = req.params.id;
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const { originalname, buffer, mimetype } = req.file;
      const b64 = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'staff_avatars',
        resource_type: 'auto',
        public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      const url = result.secure_url;
      await db.query('UPDATE staff SET photo_url = ? WHERE id = ?', [url, staffId]);
      res.json({ success: true, url });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload avatar', error: error.message });
    }
  },

  getStaffById: async (req, res) => {
    try {
      const staffId = req.params.id;
      
      // Get basic staff data with department info
      const [staff] = await db.query(`
        SELECT s.*, md.name as department_name, md.description as department_description
        FROM staff s 
        LEFT JOIN my_departments md ON s.department_id = md.id 
        WHERE s.id = ?
      `, [staffId]);
      
      if (staff.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      const staffData = {
        ...staff[0],
        status: staff[0].is_active ? 1 : 0
      };
      
      // Check which related tables exist
      const [tables] = await db.query("SHOW TABLES LIKE 'staff_%'");
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      // Fetch related data if tables exist
      if (tableNames.includes('staff_beneficiaries')) {
        const [beneficiaries] = await db.query(
          'SELECT * FROM staff_beneficiaries WHERE staff_id = ? ORDER BY entry_order',
          [staffId]
        );
        staffData.beneficiaries = beneficiaries;
      }
      
      if (tableNames.includes('staff_emergency_contacts')) {
        const [emergency_contacts] = await db.query(
          'SELECT * FROM staff_emergency_contacts WHERE staff_id = ? ORDER BY entry_order',
          [staffId]
        );
        staffData.emergency_contacts = emergency_contacts;
      }
      
      if (tableNames.includes('staff_family')) {
        const [family] = await db.query(
          'SELECT * FROM staff_family WHERE staff_id = ? ORDER BY entry_order',
          [staffId]
        );
        staffData.family = family;
      }
      
      if (tableNames.includes('staff_education')) {
        const [education] = await db.query(
          'SELECT * FROM staff_education WHERE staff_id = ? ORDER BY entry_order',
          [staffId]
        );
        staffData.education = education;
      }
      
      if (tableNames.includes('staff_work_experience')) {
        const [work_experience] = await db.query(
          'SELECT * FROM staff_work_experience WHERE staff_id = ? ORDER BY entry_order',
          [staffId]
        );
        staffData.work_experience = work_experience;
      }
      
      if (tableNames.includes('staff_references')) {
        const [references] = await db.query(
          'SELECT * FROM staff_references WHERE staff_id = ? ORDER BY entry_order',
          [staffId]
        );
        staffData.references = references;
      }
      
      // Parse benefits JSON if it exists
      if (staffData.benefits) {
        try {
          staffData.benefits = JSON.parse(staffData.benefits);
        } catch (e) {
          staffData.benefits = [];
        }
      }
      
      res.json(staffData);
    } catch (error) {
      console.error('Error fetching staff member:', error);
      res.status(500).json({ message: 'Error fetching staff member' });
    }
  },

  createStaff: async (req, res) => {
    const { name, photo_url, empl_no, id_no, role, designation, phone_number, department, department_id, business_email, department_email, salary, employment_type, gender } = req.body;
    
    try {
      const [result] = await db.query(
        'INSERT INTO staff (name, photo_url, empl_no, id_no, role, designation, phone_number, department, department_id, business_email, department_email, salary, employment_type, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, photo_url, empl_no, id_no, role, designation, phone_number, department, department_id, business_email, department_email, salary, employment_type, gender]
      );
      
      // Get the created staff with department info
      const [newStaff] = await db.query(`
        SELECT s.*, md.name as department_name, md.description as department_description
        FROM staff s 
        LEFT JOIN my_departments md ON s.department_id = md.id 
        WHERE s.id = ?
      `, [result.insertId]);
      
      res.status(201).json({
        ...newStaff[0],
        status: newStaff[0].is_active ? 1 : 0
      });
    } catch (error) {
      console.error('Error creating staff member:', error);
      res.status(500).json({ message: 'Error creating staff member' });
    }
  },

  updateStaff: async (req, res) => {
    console.log('=== UPDATE STAFF REQUEST ===');
    console.log('Staff ID:', req.params.id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      name, photo_url, empl_no, id_no, role, designation, phone_number, department, department_id, 
      business_email, department_email, salary, employment_type, gender,
      // Additional fields
      manager_id, offer_date, start_date, date_of_birth, marital_status, nationality, address,
      nhif_number, nssf_number, kra_pin, passport_number,
      bank_name, bank_branch, account_number, account_name, swift_code,
      benefits,
      // Related data
      beneficiaries, emergency_contacts, family, education, work_experience, references
    } = req.body;
    
    const staffId = req.params.id;
    
    try {
      // Get existing columns to avoid errors if migration hasn't been run
      const [columns] = await db.query('DESCRIBE staff');
      const columnNames = columns.map(col => col.Field);
      
      // Build dynamic UPDATE query based on existing columns
      const baseFields = [
        'name', 'photo_url', 'empl_no', 'id_no', 'role', 'designation',
        'phone_number', 'department', 'department_id', 'business_email',
        'department_email', 'salary', 'employment_type', 'gender'
      ];
      
      const additionalFields = [
        'manager_id', 'offer_date', 'start_date', 'date_of_birth',
        'marital_status', 'nationality', 'address',
        'nhif_number', 'nssf_number', 'kra_pin', 'passport_number',
        'bank_name', 'bank_branch', 'account_number', 'account_name', 'swift_code',
        'benefits'
      ];
      
      const fieldsToUpdate = [...baseFields];
      const values = [
        name || null, 
        photo_url || null, 
        empl_no || null, 
        id_no || null, 
        role || null, 
        designation || null,
        phone_number || null, 
        department || null, 
        department_id || null, 
        business_email || null,
        department_email || null, 
        salary || null, 
        employment_type || null, 
        gender || null
      ];
      
      // Filter out fields that don't exist in the database
      const validFields = [];
      const validValues = [];
      
      baseFields.forEach((field, index) => {
        if (columnNames.includes(field)) {
          validFields.push(field);
          validValues.push(values[index]);
        }
      });
      
      // Add additional fields if columns exist
      const fieldValueMap = {
        'manager_id': manager_id || null,
        'offer_date': offer_date || null,
        'start_date': start_date || null,
        'date_of_birth': date_of_birth || null,
        'marital_status': marital_status || null,
        'nationality': nationality || null,
        'address': address || null,
        'nhif_number': nhif_number || null,
        'nssf_number': nssf_number || null,
        'kra_pin': kra_pin || null,
        'passport_number': passport_number || null,
        'bank_name': bank_name || null,
        'bank_branch': bank_branch || null,
        'account_number': account_number || null,
        'account_name': account_name || null,
        'swift_code': swift_code || null,
        'benefits': benefits ? JSON.stringify(benefits) : null
      };
      
      additionalFields.forEach((field) => {
        if (columnNames.includes(field)) {
          validFields.push(field);
          validValues.push(fieldValueMap[field]);
        }
      });
      
      validValues.push(staffId);
      
      if (validFields.length === 0) {
        console.error('ERROR: No valid fields to update!');
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      
      const setClause = validFields.map(field => `${field} = ?`).join(', ');
      const sqlQuery = `UPDATE staff SET ${setClause} WHERE id = ?`;
      console.log('SQL Query:', sqlQuery);
      console.log('Values:', validValues);
      console.log('Fields to update:', validFields);
      console.log('Total fields:', validFields.length);
      
      const [result] = await db.query(sqlQuery, validValues);
      console.log('Update result:', result);
      console.log('Rows affected:', result.affectedRows);
      console.log('Changed rows:', result.changedRows);
      
      if (result.affectedRows === 0) {
        console.warn('WARNING: No rows were affected by the UPDATE query');
        // Check if staff exists
        const [checkStaff] = await db.query('SELECT id FROM staff WHERE id = ?', [staffId]);
        if (checkStaff.length === 0) {
          return res.status(404).json({ message: 'Staff member not found' });
        }
        return res.status(400).json({ message: 'No changes were made. Values may be the same as existing data.' });
      }
      
      console.log('Staff table updated successfully');
      console.log(`Updated ${result.affectedRows} row(s), ${result.changedRows} row(s) changed`);
      
      // Verify the update by fetching the updated record
      const [verifyStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [staffId]);
      console.log('Verified updated staff data:', verifyStaff[0]);

      // Update related tables (only if they exist)
      const [tables] = await db.query("SHOW TABLES LIKE 'staff_%'");
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      // Update beneficiaries
      if (beneficiaries && Array.isArray(beneficiaries) && tableNames.includes('staff_beneficiaries')) {
        try {
          await db.query('DELETE FROM staff_beneficiaries WHERE staff_id = ?', [staffId]);
          for (const beneficiary of beneficiaries) {
            if (beneficiary.name && beneficiary.relationship && beneficiary.contact) {
              await db.query(
                'INSERT INTO staff_beneficiaries (staff_id, name, relationship, contact, entry_order) VALUES (?, ?, ?, ?, ?)',
                [staffId, beneficiary.name, beneficiary.relationship, beneficiary.contact, beneficiary.entry_order || 1]
              );
            }
          }
        } catch (err) {
          console.error('Error updating beneficiaries:', err);
        }
      }

      // Update emergency contacts
      if (emergency_contacts && Array.isArray(emergency_contacts) && tableNames.includes('staff_emergency_contacts')) {
        try {
          await db.query('DELETE FROM staff_emergency_contacts WHERE staff_id = ?', [staffId]);
          for (const contact of emergency_contacts) {
            if (contact.name && contact.relationship && contact.contact) {
              await db.query(
                'INSERT INTO staff_emergency_contacts (staff_id, name, relationship, contact, entry_order) VALUES (?, ?, ?, ?, ?)',
                [staffId, contact.name, contact.relationship, contact.contact, contact.entry_order || 1]
              );
            }
          }
        } catch (err) {
          console.error('Error updating emergency contacts:', err);
        }
      }

      // Update family
      if (family && Array.isArray(family) && tableNames.includes('staff_family')) {
        try {
          await db.query('DELETE FROM staff_family WHERE staff_id = ?', [staffId]);
          for (const member of family) {
            if (member.name && member.relationship && member.contact) {
              await db.query(
                'INSERT INTO staff_family (staff_id, name, relationship, contact, entry_order) VALUES (?, ?, ?, ?, ?)',
                [staffId, member.name, member.relationship, member.contact, member.entry_order || 1]
              );
            }
          }
        } catch (err) {
          console.error('Error updating family:', err);
        }
      }

      // Update education
      if (education && Array.isArray(education) && tableNames.includes('staff_education')) {
        try {
          await db.query('DELETE FROM staff_education WHERE staff_id = ?', [staffId]);
          for (const edu of education) {
            if (edu.institution && edu.qualification) {
              await db.query(
                'INSERT INTO staff_education (staff_id, institution, qualification, year_of_completion, entry_order) VALUES (?, ?, ?, ?, ?)',
                [staffId, edu.institution, edu.qualification, edu.year_of_completion || null, edu.entry_order || 1]
              );
            }
          }
        } catch (err) {
          console.error('Error updating education:', err);
        }
      }

      // Update work experience
      if (work_experience && Array.isArray(work_experience) && tableNames.includes('staff_work_experience')) {
        try {
          await db.query('DELETE FROM staff_work_experience WHERE staff_id = ?', [staffId]);
          for (const exp of work_experience) {
            if (exp.organization && exp.designation) {
              await db.query(
                'INSERT INTO staff_work_experience (staff_id, organization, designation, from_date, to_date, reason_for_leaving, entry_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [staffId, exp.organization, exp.designation, exp.from_date || null, exp.to_date || null, exp.reason_for_leaving || null, exp.entry_order || 1]
              );
            }
          }
        } catch (err) {
          console.error('Error updating work experience:', err);
        }
      }

      // Update references
      if (references && Array.isArray(references) && tableNames.includes('staff_references')) {
        try {
          await db.query('DELETE FROM staff_references WHERE staff_id = ?', [staffId]);
          for (const ref of references) {
            if (ref.name) {
              await db.query(
                'INSERT INTO staff_references (staff_id, name, position, company, phone, email, entry_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [staffId, ref.name, ref.position || null, ref.company || null, ref.phone || null, ref.email || null, ref.entry_order || 1]
              );
            }
          }
        } catch (err) {
          console.error('Error updating references:', err);
        }
      }
      
      // Get the updated staff with department info
      const [updatedStaff] = await db.query(`
        SELECT s.*, md.name as department_name, md.description as department_description
        FROM staff s 
        LEFT JOIN my_departments md ON s.department_id = md.id 
        WHERE s.id = ?
      `, [staffId]);
      
      const updatedStaffData = {
        ...updatedStaff[0],
        status: updatedStaff[0].is_active ? 1 : 0
      };
      
      console.log('=== UPDATE STAFF SUCCESS ===');
      console.log('Updated staff:', updatedStaffData);
      
      res.json(updatedStaffData);
    } catch (error) {
      console.error('=== UPDATE STAFF ERROR ===');
      console.error('Error updating staff member:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: 'Error updating staff member', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  deleteStaff: async (req, res) => {
    try {
      await db.query('DELETE FROM staff WHERE id = ?', [req.params.id]);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting staff member:', error);
      res.status(500).json({ message: 'Error deleting staff member' });
    }
  },

  updateStaffStatus: async (req, res) => {
    const { status } = req.body;
    const staffId = req.params.id;
    
    try {
      console.log('Updating staff status:', { staffId, status });
      
      // First check if staff exists
      const [existingStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [staffId]);
      
      if (existingStaff.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      // Convert status (0/1) to is_active (false/true)
      const isActive = status === 1;
      
      // Update the is_active field
      await db.query(
        'UPDATE staff SET is_active = ? WHERE id = ?',
        [isActive, staffId]
      );
      
      // Get the updated staff record
      const [updatedStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [staffId]);
      
      // Map is_active back to status for frontend compatibility
      const staffWithStatus = {
        ...updatedStaff[0],
        status: updatedStaff[0].is_active ? 1 : 0
      };
      
      console.log('Staff status updated successfully:', staffWithStatus);
      res.json(staffWithStatus);
    } catch (error) {
      console.error('Error updating staff status:', error);
      res.status(500).json({ 
        message: 'Error updating staff status',
        error: error.message 
      });
    }
  },
  editStaff: async (req, res) => {
    const { id } = req.params;
    const { name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email } = req.body;
    try {
      await db.query(
        'UPDATE staff SET name = ?, photo_url = ?, empl_no = ?, id_no = ?, role = ?, phone_number = ?, department = ?, business_email = ?, department_email = ? WHERE id = ?',
        [name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email, id]
      );
      res.json({ id, name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update employee', error: error.message });
    }
  },
  deactivateStaff: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('UPDATE staff SET is_active = FALSE WHERE id = ?', [id]);
      res.json({ id, is_active: false });
    } catch (error) {
      res.status(500).json({ message: 'Failed to deactivate employee', error: error.message });
    }
  },
  uploadDocument: async (req, res) => {
    const staffId = req.params.id;
    console.log('Received file:', req.file);
    console.log('Request body:', req.body);
    if (!req.file) return res.status(400).json({ message: 'No file uploaded', file: req.file, body: req.body });
    
    const { originalname, buffer, mimetype } = req.file;
    const { description } = req.body;
    
    try {
      // Check if Cloudinary is properly configured
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const fileStorageType = process.env.FILE_STORAGE_TYPE || 'cloudinary';
      
      let fileUrl;
      
      if (fileStorageType === 'local' || !cloudName || !apiKey || !apiSecret) {
        // Use local file storage
        console.log('Using local file storage for document...');
        const fs = require('fs');
        const path = require('path');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/documents');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${staffId}_${timestamp}_${sanitizedName}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Save file locally
        fs.writeFileSync(filePath, buffer);
        
        // Create URL for local file
        fileUrl = `/uploads/documents/${filename}`;
        console.log('Local document saved:', filePath);
      } else {
        // Use Cloudinary
        console.log('Using Cloudinary upload for document...');
        
        // Convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'employee_documents',
          resource_type: 'auto',
          public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
        });
        fileUrl = result.secure_url;
      }
      
      await db.query(
        'INSERT INTO employee_documents (staff_id, file_name, file_url, description) VALUES (?, ?, ?, ?)',
        [staffId, originalname, fileUrl, description || null]
      );

      res.status(201).json({ message: 'Document uploaded', file_url: fileUrl });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ message: 'Failed to upload document', error: error.message });
    }
  },
  getDocuments: async (req, res) => {
    const staffId = req.params.id;
    try {
      const [docs] = await db.query('SELECT * FROM employee_documents WHERE staff_id = ? ORDER BY uploaded_at DESC', [staffId]);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
    }
  },

  deleteDocument: async (req, res) => {
    const docId = req.params.docId;
    try {
      // Optionally: fetch document to get file_url for Cloudinary deletion
      await db.query('DELETE FROM employee_documents WHERE id = ?', [docId]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete document', error: error.message });
    }
  },
  // Employee Contracts
  uploadContract: async (req, res) => {
    console.log('=== Contract Upload Started ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const staffId = req.params.id;
    console.log('Staff ID:', staffId);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname, buffer, mimetype } = req.file;
    const { start_date, end_date, renewed_from, description } = req.body;
    
    console.log('File details:', { originalname, mimetype });
    console.log('Form data:', { start_date, end_date, renewed_from });
    
    try {
      // Check if Cloudinary is properly configured
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const fileStorageType = process.env.FILE_STORAGE_TYPE || 'cloudinary';
      
      console.log('File storage config check:');
      console.log('- Storage type:', fileStorageType);
      console.log('- Cloud name:', cloudName ? 'SET' : 'NOT SET');
      console.log('- API key:', apiKey ? 'SET' : 'NOT SET');
      console.log('- API secret:', apiSecret ? 'SET' : 'NOT SET');
      
      let fileUrl;
      
      if (fileStorageType === 'local' || !cloudName || !apiKey || !apiSecret) {
        // Use local file storage
        console.log('Using local file storage...');
        const fs = require('fs');
        const path = require('path');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/contracts');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${staffId}_${timestamp}_${sanitizedName}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Save file locally
        fs.writeFileSync(filePath, buffer);
        
        // Create URL for local file
        fileUrl = `/uploads/contracts/${filename}`;
        console.log('Local file saved:', filePath);
        console.log('File URL:', fileUrl);
      } else {
        // Use Cloudinary
        console.log('Using Cloudinary upload...');
        
        // Convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'employee_contracts',
          resource_type: 'auto',
          public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
        });
        
        console.log('Cloudinary upload successful:', result);
        fileUrl = result.secure_url;
      }
      
      console.log('Saving to database...');
      const [dbResult] = await db.query(
        'INSERT INTO employee_contracts (staff_id, file_name, file_url, start_date, end_date, renewed_from, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [staffId, originalname, fileUrl, start_date, end_date, renewed_from || null, description || null]
      );
      console.log('Database insert successful:', dbResult);
      
      console.log('=== Contract Upload Completed Successfully ===');
      res.status(201).json({ message: 'Contract uploaded', file_url: fileUrl });
    } catch (error) {
      console.error('=== Contract Upload Failed ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to upload contract', error: error.message });
    }
  },

  getContracts: async (req, res) => {
    console.log('=== Fetching Contracts ===');
    console.log('Request params:', req.params);
    
    const staffId = req.params.id;
    console.log('Staff ID:', staffId);
    
    try {
      console.log('Executing database query...');
      const [contracts] = await db.query('SELECT * FROM employee_contracts WHERE staff_id = ? ORDER BY end_date DESC', [staffId]);
      console.log('Contracts found:', contracts.length);
      console.log('Contracts data:', contracts);
      res.json(contracts);
    } catch (error) {
      console.error('=== Failed to fetch contracts ===');
      console.error('Error:', error);
      res.status(500).json({ message: 'Failed to fetch contracts', error: error.message });
    }
  },

  renewContract: async (req, res) => {
    // This is just an alias for uploadContract, but expects renewed_from in body
    req.body.renewed_from = req.body.renewed_from || req.params.contractId;
    return staffController.uploadContract(req, res);
  },

  getExpiringContracts: async (req, res) => {
    try {
      const [contracts] = await db.query(
        `SELECT ec.*, s.name as staff_name FROM employee_contracts ec
         JOIN staff s ON ec.staff_id = s.id
         WHERE ec.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
         ORDER BY ec.end_date ASC`
      );
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch expiring contracts', error: error.message });
    }
  },

  // Termination Letters
  uploadTerminationLetter: async (req, res) => {
    console.log('=== Termination Letter Upload Started ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const staffId = req.params.id;
    console.log('Staff ID:', staffId);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname, buffer, mimetype } = req.file;
    const { termination_date } = req.body;
    
    console.log('File details:', { originalname, mimetype });
    console.log('Form data:', { termination_date });
    
    if (!termination_date) {
      console.log('No termination date provided');
      return res.status(400).json({ message: 'Termination date is required' });
    }
    
    try {
      // Check if Cloudinary is properly configured
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const fileStorageType = process.env.FILE_STORAGE_TYPE || 'cloudinary';
      
      console.log('File storage config check:');
      console.log('- Storage type:', fileStorageType);
      console.log('- Cloud name:', cloudName ? 'SET' : 'NOT SET');
      console.log('- API key:', apiKey ? 'SET' : 'NOT SET');
      console.log('- API secret:', apiSecret ? 'SET' : 'NOT SET');
      
      let fileUrl;
      
      if (fileStorageType === 'local' || !cloudName || !apiKey || !apiSecret) {
        // Use local file storage
        console.log('Using local file storage for termination letter...');
        const fs = require('fs');
        const path = require('path');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/termination_letters');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${staffId}_${timestamp}_${sanitizedName}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Save file locally
        fs.writeFileSync(filePath, buffer);
        
        // Create URL for local file
        fileUrl = `/uploads/termination_letters/${filename}`;
        console.log('Local termination letter saved:', filePath);
      } else {
        // Use Cloudinary
        console.log('Using Cloudinary upload for termination letter...');
        
        // Convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'termination_letters',
          resource_type: 'auto',
          public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
        });
        
        console.log('Cloudinary upload successful:', result);
        fileUrl = result.secure_url;
      }
      
      console.log('Saving to database...');
      const [dbResult] = await db.query(
        'INSERT INTO termination_letters (staff_id, file_name, file_url, termination_date) VALUES (?, ?, ?, ?)',
        [staffId, originalname, fileUrl, termination_date]
      );
      console.log('Database insert successful:', dbResult);
      
      // Update employee status to inactive
      console.log('Updating employee status to inactive...');
      await db.query('UPDATE staff SET is_active = 0 WHERE id = ?', [staffId]);
      console.log('Employee status updated successfully');
      
      console.log('=== Termination Letter Upload Completed Successfully ===');
      res.status(201).json({ message: 'Termination letter uploaded and employee deactivated', file_url: fileUrl });
    } catch (error) {
      console.error('=== Termination Letter Upload Failed ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to upload termination letter', error: error.message });
    }
  },

  getTerminationLetters: async (req, res) => {
    console.log('=== Fetching Termination Letters ===');
    console.log('Request params:', req.params);
    
    const staffId = req.params.id;
    console.log('Staff ID:', staffId);
    
    try {
      console.log('Executing database query...');
      const [letters] = await db.query('SELECT * FROM termination_letters WHERE staff_id = ? ORDER BY uploaded_at DESC', [staffId]);
      console.log('Termination letters found:', letters.length);
      console.log('Termination letters data:', letters);
      res.json(letters);
    } catch (error) {
      console.error('=== Failed to fetch termination letters ===');
      console.error('Error:', error);
      res.status(500).json({ message: 'Failed to fetch termination letters', error: error.message });
    }
  },

  // Warning Letters
  uploadWarningLetter: async (req, res) => {
    console.log('=== Warning Letter Upload Started ===');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const staffId = req.params.id;
    console.log('Staff ID:', staffId);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname, buffer, mimetype } = req.file;
    const { warning_date, warning_type, description } = req.body;
    
    console.log('File details:', { originalname, mimetype });
    console.log('Form data:', { warning_date, warning_type, description });
    
    if (!warning_date || !warning_type) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Warning date and type are required' });
    }
    
    try {
      // Check if Cloudinary is properly configured
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const fileStorageType = process.env.FILE_STORAGE_TYPE || 'cloudinary';
      
      console.log('File storage config check:');
      console.log('- Storage type:', fileStorageType);
      console.log('- Cloud name:', cloudName ? 'SET' : 'NOT SET');
      console.log('- API key:', apiKey ? 'SET' : 'NOT SET');
      console.log('- API secret:', apiSecret ? 'SET' : 'NOT SET');
      
      let fileUrl;
      
      if (fileStorageType === 'local' || !cloudName || !apiKey || !apiSecret) {
        // Use local file storage
        console.log('Using local file storage for warning letter...');
        const fs = require('fs');
        const path = require('path');
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/warning_letters');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${staffId}_${timestamp}_${sanitizedName}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Save file locally
        fs.writeFileSync(filePath, buffer);
        
        // Create URL for local file
        fileUrl = `/uploads/warning_letters/${filename}`;
        console.log('Local warning letter saved:', filePath);
      } else {
        // Use Cloudinary
        console.log('Using Cloudinary upload for warning letter...');
        
        // Convert buffer to base64 for Cloudinary
        const b64 = Buffer.from(buffer).toString('base64');
        const dataURI = `data:${mimetype};base64,${b64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'warning_letters',
          resource_type: 'auto',
          public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
        });
        
        console.log('Cloudinary upload successful:', result);
        fileUrl = result.secure_url;
      }
      
      console.log('Saving to database...');
      const [dbResult] = await db.query(
        'INSERT INTO warning_letters (staff_id, file_name, file_url, warning_date, warning_type, description) VALUES (?, ?, ?, ?, ?, ?)',
        [staffId, originalname, fileUrl, warning_date, warning_type, description || null]
      );
      console.log('Database insert successful:', dbResult);
      
      console.log('=== Warning Letter Upload Completed Successfully ===');
      res.status(201).json({ message: 'Warning letter uploaded successfully', file_url: fileUrl });
    } catch (error) {
      console.error('=== Warning Letter Upload Failed ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: 'Failed to upload warning letter', error: error.message });
    }
  },

  getWarningLetters: async (req, res) => {
    console.log('=== Fetching Warning Letters ===');
    console.log('Request params:', req.params);
    
    const staffId = req.params.id;
    console.log('Staff ID:', staffId);
    
    try {
      console.log('Executing database query...');
      const [letters] = await db.query('SELECT * FROM warning_letters WHERE staff_id = ? ORDER BY warning_date DESC', [staffId]);
      console.log('Warning letters found:', letters.length);
      console.log('Warning letters data:', letters);
      res.json(letters);
    } catch (error) {
      console.error('=== Failed to fetch warning letters ===');
      console.error('Error:', error);
      res.status(500).json({ message: 'Failed to fetch warning letters', error: error.message });
    }
  },
  // Employee Warnings
  postWarning: async (req, res) => {
    const staffId = req.params.id;
    const { message, issued_by } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required' });
    try {
      await db.query(
        'INSERT INTO employee_warnings (staff_id, message, issued_by) VALUES (?, ?, ?)',
        [staffId, message, issued_by || null]
      );
      res.status(201).json({ message: 'Warning posted' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to post warning', error: error.message });
    }
  },

  getWarnings: async (req, res) => {
    const staffId = req.params.id;
    try {
      const [warnings] = await db.query('SELECT * FROM employee_warnings WHERE staff_id = ? ORDER BY issued_at DESC', [staffId]);
      res.json(warnings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch warnings', error: error.message });
    }
  },

  deleteWarning: async (req, res) => {
    const warningId = req.params.warningId;
    try {
      await db.query('DELETE FROM employee_warnings WHERE id = ?', [warningId]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete warning', error: error.message });
    }
  },
  getEmployeeWorkingHours: async (req, res) => {
    try {
      const { start_date, end_date, staff_id } = req.query;
      console.log('Query params:', { start_date, end_date, staff_id });
      let params = [];
      let where = 'WHERE 1=1';
      if (start_date) {
        where += ' AND a.date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        where += ' AND a.date <= ?';
        params.push(end_date);
      }
      
      // Try to detect if table uses user_id or staff_id
      // First try with user_id (new schema)
      let query, attendance;
      try {
        if (staff_id) {
          where += ' AND a.user_id = ?';
          params.push(staff_id);
        }
        query = `
          SELECT 
            a.id, 
            IFNULL(s.name, IFNULL(u.username, CONCAT('User ', a.user_id))) as name,
            IFNULL(s.department, 'N/A') as department,
            a.date, 
            a.checkin_time, 
            a.checkout_time, 
            a.user_id as staff_id
          FROM staff_attendance a
          LEFT JOIN users u ON a.user_id = u.id
          LEFT JOIN staff s ON a.user_id = s.id
          ${where}
          ORDER BY a.date DESC, a.id DESC
        `;
        console.log('SQL Query (with user_id):', query);
        console.log('Query params:', params);
        [attendance] = await db.query(query, params);
        console.log('Attendance records found:', attendance.length);
      } catch (queryError) {
        // If user_id fails, try with staff_id (old schema)
        console.log('Query with user_id failed, trying staff_id...');
        console.error('Error:', queryError.message);
        
        // Reset params and where clause
        params = [];
        where = 'WHERE 1=1';
        if (start_date) {
          where += ' AND a.date >= ?';
          params.push(start_date);
        }
        if (end_date) {
          where += ' AND a.date <= ?';
          params.push(end_date);
        }
        if (staff_id) {
          where += ' AND a.staff_id = ?';
          params.push(staff_id);
        }
        
        query = `
          SELECT 
            a.id, 
            IFNULL(s.name, 'Unknown') as name,
            IFNULL(s.department, 'N/A') as department,
            a.date, 
            a.checkin_time, 
            a.checkout_time, 
            a.staff_id
          FROM staff_attendance a
          LEFT JOIN staff s ON a.staff_id = s.id
          ${where}
          ORDER BY a.date DESC, a.id DESC
        `;
        console.log('SQL Query (with staff_id):', query);
        console.log('Query params:', params);
        [attendance] = await db.query(query, params);
        console.log('Attendance records found:', attendance.length);
      }
      // Get all leaves in range
      let leaveParams = [];
      let leaveWhere = 'WHERE 1=1';
      if (start_date) {
        leaveWhere += ' AND lr.start_date <= ?';
        leaveParams.push(end_date || start_date);
        leaveWhere += ' AND lr.end_date >= ?';
        leaveParams.push(start_date);
      }
      if (staff_id) {
        leaveWhere += ' AND lr.employee_id = ?';
        leaveParams.push(staff_id);
      }
      const [leaves] = await db.query(`
        SELECT lr.employee_id, lr.start_date, lr.end_date, lr.status
        FROM leave_requests lr
        ${leaveWhere}
      `, leaveParams);
      // Build a map of leave periods for quick lookup
      const leaveMap = {};
      for (const lv of leaves) {
        if (!leaveMap[lv.employee_id]) leaveMap[lv.employee_id] = [];
        leaveMap[lv.employee_id].push({ start: lv.start_date, end: lv.end_date, status: lv.status });
      }
      // For each attendance record, determine status and time spent
      const results = attendance.map(a => {
        let status = 'Absent';
        let time_spent = '';
        
        // Parse VARCHAR date/time fields
        // checkin_time and checkout_time are VARCHAR, so we need to parse them
        if (a.checkin_time && a.checkin_time !== '' && a.checkin_time !== 'NULL') {
          status = 'Present';
          try {
            // Try to parse the checkin_time (could be various formats)
            const checkinStr = a.checkin_time.toString().trim();
            const checkoutStr = a.checkout_time && a.checkout_time !== '' && a.checkout_time !== 'NULL' 
              ? a.checkout_time.toString().trim() 
              : null;
            
            const checkin = new Date(checkinStr);
            const checkout = checkoutStr ? new Date(checkoutStr) : null;
            
            // If date parsing fails, try to handle it differently
            if (isNaN(checkin.getTime())) {
              // If it's just time, we can't calculate duration
              time_spent = '-';
            } else {
              const end = checkout && !isNaN(checkout.getTime()) ? checkout : new Date();
              const diffMs = end.getTime() - checkin.getTime();
              if (diffMs > 0) {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const mins = Math.floor((diffMs / (1000 * 60)) % 60);
                time_spent = `${hours}h ${mins}m`;
              } else {
                time_spent = '-';
              }
            }
          } catch (e) {
            console.error('Error parsing time:', e);
            time_spent = '-';
          }
        }
        
        // Check if on leave for this day
        // Note: leave_requests uses employee_id which might reference staff.id
        // We need to check if user_id matches staff.id or if there's another mapping
        const empLeaves = leaveMap[a.staff_id] || [];
        const onLeave = empLeaves.some(lv => {
          // Compare dates as strings since date is VARCHAR
          const recordDate = a.date.toString();
          return lv.status === 'approved' && recordDate >= lv.start && recordDate <= lv.end;
        });
        if (onLeave) status = 'Leave';
        
        return {
          id: a.id,
          name: a.name || 'Unknown',
          department: a.department || 'N/A',
          date: a.date,
          checkin_time: a.checkin_time,
          checkout_time: a.checkout_time,
          time_spent,
          status,
        };
      });
      console.log('Results count:', results.length);
      if (results.length > 0) {
        console.log('Sample result:', results[0]);
      }
      res.json(results);
    } catch (error) {
      console.error('Error fetching employee working hours:', error);
      res.status(500).json({ message: 'Failed to fetch employee working hours', error: error.message });
    }
  },
  getEmployeeWorkingDays: async (req, res) => {
    try {
      const { month, staff_id } = req.query;
      // Parse month (YYYY-MM)
      let year, monthNum;
      if (month) {
        [year, monthNum] = month.split('-').map(Number);
      } else {
        const now = new Date();
        year = now.getFullYear();
        monthNum = now.getMonth() + 1;
      }
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      // Get all staff
      let staffParams = [];
      let staffWhere = '';
      if (staff_id) {
        staffWhere = 'WHERE id = ?';
        staffParams.push(staff_id);
      }
      const [staff] = await db.query(`SELECT id, name, department FROM staff ${staffWhere}`, staffParams);
      // Get all attendance for the month
      const [attendance] = await db.query(`
        SELECT staff_id, date, checkin_time
        FROM attendance
        WHERE date >= ? AND date <= ?
      `, [startDate, endDate]);
      // Get all leaves for the month
      const [leaves] = await db.query(`
        SELECT employee_id, start_date, end_date, status
        FROM leave_requests
        WHERE status = 'approved' AND start_date <= ? AND end_date >= ?
      `, [endDate, startDate]);
      // Get Kenya public holidays for the month from public_holidays table
      let holidayCount = 0;
      try {
        const [holidays] = await db.query(`
          SELECT DISTINCT date, name
          FROM public_holidays
          WHERE date >= ? AND date <= ?
          AND country = 'Kenya'
        `, [startDate, endDate]);
        
        console.log(`[Kenya Holidays] Found ${holidays.length} public holidays for ${month}`);
        
        // Count holidays that fall on working days (non-Sundays)
        for (const holiday of holidays) {
          let dateStr;
          if (holiday.date instanceof Date) {
            dateStr = holiday.date.toISOString().slice(0, 10);
          } else {
            // MySQL DATE is returned as string 'YYYY-MM-DD'
            dateStr = String(holiday.date).slice(0, 10);
          }
          
          const dateObj = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
          const dayOfWeek = dateObj.getDay();
          
          // Count all holidays (including those that fall on Sundays as they're still public holidays)
          holidayCount++;
          console.log(`[Kenya Holidays] ${dateStr} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]}) - ${holiday.name}`);
        }
        
        console.log(`[Kenya Holidays] Total public holidays for ${month}: ${holidayCount}`);
      } catch (err) {
        console.error('Error fetching Kenya public holidays:', err);
        console.error('This might mean the public_holidays table does not exist. Please run: server/database/create_public_holidays_table.sql');
        // Continue with holidayCount = 0 if there's an error
      }
      // For each staff, calculate days present, leave, absent
      const results = staff.map(emp => {
        // Build set of all working days in month (exclude Sundays)
        // Only include dates up to today to prevent counting future dates as absent
        const days = [];
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today to include today
        
        for (let d = 1; d <= daysInMonth; d++) {
          // Create date using Date constructor to avoid timezone issues
          const dateObj = new Date(year, monthNum - 1, d);
          // Only include dates that are not in the future
          if (dateObj.getDay() !== 0 && dateObj <= today) { // 0 = Sunday
            days.push(dateObj.toISOString().slice(0, 10));
          }
        }
        const effectiveWorkingDays = days.length;
        // Attendance days
        const presentDays = new Set(
          attendance.filter(a => a.staff_id === emp.id && days.includes(a.date)).map(a => a.date)
        );
        // Leave days
        const empLeaves = leaves.filter(lv => lv.employee_id === emp.id);
        let leaveDays = 0;
        for (const lv of empLeaves) {
          const leaveStart = new Date(lv.start_date) < new Date(startDate) ? new Date(startDate) : new Date(lv.start_date);
          const leaveEnd = new Date(lv.end_date) > new Date(endDate) ? new Date(endDate) : new Date(lv.end_date);
          for (let d = new Date(leaveStart); d <= leaveEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            if (days.includes(dateStr)) leaveDays++;
          }
        }
        // Absent days = total - present - leave
        const absentDays = effectiveWorkingDays - presentDays.size - leaveDays;
        // Attendance percentage
        let attendance_pct = 'N/A';
        if (effectiveWorkingDays > 0) {
          attendance_pct = ((presentDays.size / effectiveWorkingDays) * 100).toFixed(1);
        }
        return {
          id: emp.id,
          name: emp.name,
          department: emp.department,
          effective_working_days: effectiveWorkingDays,
          days_present: presentDays.size,
          leave_days: leaveDays,
          absent_days: absentDays < 0 ? 0 : absentDays,
          holidays: holidayCount,
          attendance_pct,
        };
      });
      res.json(results);
    } catch (error) {
      console.error('Error fetching employee working days:', error);
      res.status(500).json({ message: 'Failed to fetch employee working days', error: error.message });
    }
  },
  getOutOfOfficeRequests: async (req, res) => {
    try {
      const { staff_id, start_date, end_date } = req.query;
      let where = 'WHERE 1=1';
      let params = [];
      if (staff_id) {
        where += ' AND o.staff_id = ?';
        params.push(staff_id);
      }
      if (start_date) {
        where += ' AND o.date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        where += ' AND o.date <= ?';
        params.push(end_date);
      }
      const [rows] = await db.query(`
        SELECT o.id, o.staff_id, s.name AS staff_name, s.role AS staff_role, s.photo_url, o.date, o.reason, o.comment, o.status, o.created_at, o.updated_at, o.approved_by, o.approved_at
        FROM out_of_office_requests o
        LEFT JOIN staff s ON o.staff_id = s.id
        ${where}
        ORDER BY o.date DESC, o.id DESC
      `, params);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching out of office requests:', error);
      res.status(500).json({ message: 'Failed to fetch out of office requests', error: error.message });
    }
  },

  createOutOfOfficeRequest: async (req, res) => {
    try {
      const { staff_id, date, reason, comment, status } = req.body;
      
      if (!staff_id || !date || !reason) {
        return res.status(400).json({ message: 'staff_id, date, and reason are required' });
      }

      const [result] = await db.query(`
        INSERT INTO out_of_office_requests (staff_id, date, reason, comment, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [staff_id, date, reason, comment || '', status || 'pending']);

      const [newRequest] = await db.query(`
        SELECT o.id, o.staff_id, s.name AS staff_name, s.role AS staff_role, s.photo_url, o.date, o.reason, o.comment, o.status, o.created_at, o.updated_at, o.approved_by, o.approved_at
        FROM out_of_office_requests o
        LEFT JOIN staff s ON o.staff_id = s.id
        WHERE o.id = ?
      `, [result.insertId]);

      res.status(201).json(newRequest[0]);
    } catch (error) {
      console.error('Error creating out of office request:', error);
      res.status(500).json({ message: 'Failed to create out of office request', error: error.message });
    }
  },

  updateOutOfOfficeRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { date, reason, comment, status } = req.body;

      if (!date || !reason) {
        return res.status(400).json({ message: 'date and reason are required' });
      }

      const updateFields = [];
      const updateValues = [];

      if (date) {
        updateFields.push('date = ?');
        updateValues.push(date);
      }
      if (reason) {
        updateFields.push('reason = ?');
        updateValues.push(reason);
      }
      if (comment !== undefined) {
        updateFields.push('comment = ?');
        updateValues.push(comment);
      }
      if (status) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      await db.query(`
        UPDATE out_of_office_requests
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      const [updatedRequest] = await db.query(`
        SELECT o.id, o.staff_id, s.name AS staff_name, s.role AS staff_role, s.photo_url, o.date, o.reason, o.comment, o.status, o.created_at, o.updated_at, o.approved_by, o.approved_at
        FROM out_of_office_requests o
        LEFT JOIN staff s ON o.staff_id = s.id
        WHERE o.id = ?
      `, [id]);

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Out of office request not found' });
      }

      res.json(updatedRequest[0]);
    } catch (error) {
      console.error('Error updating out of office request:', error);
      res.status(500).json({ message: 'Failed to update out of office request', error: error.message });
    }
  },

  updateOutOfOfficeRequestStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, approved_by, approved_at } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'status is required' });
      }

      const updateFields = ['status = ?', 'updated_at = NOW()'];
      const updateValues = [status];

      if (approved_by) {
        updateFields.push('approved_by = ?');
        updateValues.push(approved_by);
      }
      if (approved_at) {
        updateFields.push('approved_at = ?');
        updateValues.push(approved_at);
      } else if (status !== 'pending') {
        updateFields.push('approved_at = NOW()');
      }

      updateValues.push(id);

      await db.query(`
        UPDATE out_of_office_requests
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      const [updatedRequest] = await db.query(`
        SELECT o.id, o.staff_id, s.name AS staff_name, s.role AS staff_role, s.photo_url, o.date, o.reason, o.comment, o.status, o.created_at, o.updated_at, o.approved_by, o.approved_at
        FROM out_of_office_requests o
        LEFT JOIN staff s ON o.staff_id = s.id
        WHERE o.id = ?
      `, [id]);

      if (updatedRequest.length === 0) {
        return res.status(404).json({ message: 'Out of office request not found' });
      }

      res.json(updatedRequest[0]);
    } catch (error) {
      console.error('Error updating out of office request status:', error);
      res.status(500).json({ message: 'Failed to update out of office request status', error: error.message });
    }
  },

  deleteOutOfOfficeRequest: async (req, res) => {
    try {
      const { id } = req.params;

      const [result] = await db.query('DELETE FROM out_of_office_requests WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Out of office request not found' });
      }

      res.json({ message: 'Out of office request deleted successfully' });
    } catch (error) {
      console.error('Error deleting out of office request:', error);
      res.status(500).json({ message: 'Failed to delete out of office request', error: error.message });
    }
  },

  getAllDepartments: async (req, res) => {
    try {
      const [departments] = await db.query('SELECT * FROM my_departments WHERE is_active = TRUE ORDER BY name');
      res.json(departments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
    }
  }
};

module.exports = staffController; 