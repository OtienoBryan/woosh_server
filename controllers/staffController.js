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

      res.status(201).json({ message: 'Document uploaded', file_url: fileUrl });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
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
    const { start_date, end_date, renewed_from } = req.body;
    
    console.log('File details:', { originalname, path: filePath });
    console.log('Form data:', { start_date, end_date, renewed_from });
    
    try {
      // Check if Cloudinary is properly configured
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      
      console.log('Cloudinary config check:');
      console.log('- Cloud name:', cloudName ? 'SET' : 'NOT SET');
      console.log('- API key:', apiKey ? 'SET' : 'NOT SET');
      console.log('- API secret:', apiSecret ? 'SET' : 'NOT SET');
      
      let fileUrl;
      
      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      console.log('Using Cloudinary upload...');
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'employee_contracts',
        resource_type: 'auto',
        public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      
      console.log('Cloudinary upload successful:', result);
      fileUrl = result.secure_url;
      console.log('Cloudinary upload successful:', result);
      
      console.log('Saving to database...');
      const [dbResult] = await db.query(
        'INSERT INTO employee_contracts (staff_id, file_name, file_url, start_date, end_date, renewed_from) VALUES (?, ?, ?, ?, ?, ?)',
        [staffId, originalname, fileUrl, start_date, end_date, renewed_from || null]
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
    
    console.log('File details:', { originalname, path: filePath });
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
      
      console.log('Cloudinary config check:');
      console.log('- Cloud name:', cloudName ? 'SET' : 'NOT SET');
      console.log('- API key:', apiKey ? 'SET' : 'NOT SET');
      console.log('- API secret:', apiSecret ? 'SET' : 'NOT SET');
      
      let fileUrl;
      
      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      console.log('Using Cloudinary upload...');
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'termination_letters',
        resource_type: 'auto',
        public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      
      console.log('Cloudinary upload successful:', result);
      fileUrl = result.secure_url;
      
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
    
    console.log('File details:', { originalname, path: filePath });
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
      
      console.log('Cloudinary config check:');
      console.log('- Cloud name:', cloudName ? 'SET' : 'NOT SET');
      console.log('- API key:', apiKey ? 'SET' : 'NOT SET');
      console.log('- API secret:', apiSecret ? 'SET' : 'NOT SET');
      
      let fileUrl;
      
      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(buffer).toString('base64');
      const dataURI = `data:${mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      console.log('Using Cloudinary upload...');
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'warning_letters',
        resource_type: 'auto',
        public_id: `${staffId}_${Date.now()}_${originalname}`.replace(/\s+/g, '_'),
      });
      
      console.log('Cloudinary upload successful:', result);
      fileUrl = result.secure_url;
      
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
      if (staff_id) {
        where += ' AND a.staff_id = ?';
        params.push(staff_id);
      }
      // Get attendance records joined with staff
      const [attendance] = await db.query(`
        SELECT a.id, s.name, s.department, a.date, a.checkin_time, a.checkout_time, a.staff_id
        FROM attendance a
        LEFT JOIN staff s ON a.staff_id = s.id
        ${where}
        ORDER BY a.date DESC, s.name
      `, params);
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
        if (a.checkin_time) {
          status = 'Present';
          const checkin = new Date(a.checkin_time);
          const checkout = a.checkout_time ? new Date(a.checkout_time) : null;
          const end = checkout || new Date();
          const diffMs = end.getTime() - checkin.getTime();
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const mins = Math.floor((diffMs / (1000 * 60)) % 60);
          time_spent = `${hours}h ${mins}m`;
        }
        // Check if on leave for this day
        const empLeaves = leaveMap[a.staff_id] || [];
        const onLeave = empLeaves.some(lv => {
          return lv.status === 'approved' && a.date >= lv.start && a.date <= lv.end;
        });
        if (onLeave) status = 'Leave';
        return {
          id: a.id,
          name: a.name,
          department: a.department,
          date: a.date,
          checkin_time: a.checkin_time,
          checkout_time: a.checkout_time,
          time_spent,
          status,
        };
      });
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
      // For each staff, calculate days present, leave, absent
      const results = staff.map(emp => {
        // Build set of all working days in month (exclude Sundays)
        const days = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(`${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
          if (dateObj.getDay() !== 0) { // 0 = Sunday
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
        SELECT o.id, s.name AS staff_name, o.date, o.reason, o.comment, o.status
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
  }
};

module.exports = staffController; 