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
      const [staff] = await db.query('SELECT * FROM staff ORDER BY created_at DESC');
      if (!staff || staff.length === 0) {
        return res.json([]);
      }
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching staff list', error: error.message });
    }
  },

  getStaffById: async (req, res) => {
    try {
      const [staff] = await db.query('SELECT * FROM staff WHERE id = ?', [req.params.id]);
      
      if (staff.length === 0) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      
      res.json(staff[0]);
    } catch (error) {
      console.error('Error fetching staff member:', error);
      res.status(500).json({ message: 'Error fetching staff member' });
    }
  },

  createStaff: async (req, res) => {
    const { name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email, salary, employment_type } = req.body;
    
    try {
      const [result] = await db.query(
        'INSERT INTO staff (name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email, salary, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email, salary, employment_type]
      );
      res.status(201).json({
        id: result.insertId,
        name,
        photo_url,
        empl_no,
        id_no,
        role,
        phone_number,
        department,
        business_email,
        department_email,
        salary,
        employment_type
      });
    } catch (error) {
      console.error('Error creating staff member:', error);
      res.status(500).json({ message: 'Error creating staff member' });
    }
  },

  updateStaff: async (req, res) => {
    const { name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email, salary, employment_type } = req.body;
    
    try {
      await db.query(
        'UPDATE staff SET name = ?, photo_url = ?, empl_no = ?, id_no = ?, role = ?, phone_number = ?, department = ?, business_email = ?, department_email = ?, salary = ?, employment_type = ? WHERE id = ?',
        [name, photo_url, empl_no, id_no, role, phone_number, department, business_email, department_email, salary, employment_type, req.params.id]
      );
      res.json({
        id: parseInt(req.params.id),
        name,
        photo_url,
        empl_no,
        id_no,
        role,
        phone_number,
        department,
        business_email,
        department_email,
        salary,
        employment_type
      });
    } catch (error) {
      console.error('Error updating staff member:', error);
      res.status(500).json({ message: 'Error updating staff member' });
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
      
      // Update the status
      await db.query(
        'UPDATE staff SET status = ? WHERE id = ?',
        [status, staffId]
      );
      
      // Get the updated staff record
      const [updatedStaff] = await db.query('SELECT * FROM staff WHERE id = ?', [staffId]);
      
      console.log('Staff status updated successfully:', updatedStaff[0]);
      res.json(updatedStaff[0]);
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
    const { originalname, path: filePath } = req.file;
    const { description } = req.body;
    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'employee_documents',
        resource_type: 'auto',
        public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      const fileUrl = result.secure_url;
      await db.query(
        'INSERT INTO employee_documents (staff_id, file_name, file_url, description) VALUES (?, ?, ?, ?)',
        [staffId, originalname, fileUrl, description || null]
      );
      // Optionally delete local file
      fs.unlink(filePath, () => {});
      res.status(201).json({ message: 'Document uploaded', file_url: fileUrl });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ message: 'Failed to upload document', error });
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
    const staffId = req.params.id;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { originalname, path: filePath } = req.file;
    const { start_date, end_date, renewed_from } = req.body;
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'employee_contracts',
        resource_type: 'auto',
        public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      const fileUrl = result.secure_url;
      await db.query(
        'INSERT INTO employee_contracts (staff_id, file_name, file_url, start_date, end_date, renewed_from) VALUES (?, ?, ?, ?, ?, ?)',
        [staffId, originalname, fileUrl, start_date, end_date, renewed_from || null]
      );
      fs.unlink(filePath, () => {});
      res.status(201).json({ message: 'Contract uploaded', file_url: fileUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload contract', error });
    }
  },

  getContracts: async (req, res) => {
    const staffId = req.params.id;
    try {
      const [contracts] = await db.query('SELECT * FROM employee_contracts WHERE staff_id = ? ORDER BY end_date DESC', [staffId]);
      res.json(contracts);
    } catch (error) {
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
  }
};

module.exports = staffController; 