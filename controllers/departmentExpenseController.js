const db = require('../database/db');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const uploadFile = async (file) => {
  if (!file) {
    throw new Error('Supporting document is required');
  }

  const fileStorageType = process.env.FILE_STORAGE_TYPE || 'cloudinary';
  const hasCloudinaryConfig =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (fileStorageType === 'local' || !hasCloudinaryConfig) {
    const uploadsDir = path.join(__dirname, '../uploads/department-expenses');
    ensureDirectoryExists(uploadsDir);

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `dept-exp_${Date.now()}_${sanitizedName}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/department-expenses/${filename}`,
      storage: 'local',
      fileName: filename
    };
  }

  const stream = require('stream');
  const uploadPromise = new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'department_expenses',
        resource_type: 'auto',
        public_id: `${Date.now()}_${file.originalname}`.replace(/\s+/g, '_')
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);
    bufferStream.pipe(uploadStream);
  });

  const result = await uploadPromise;

  return {
    url: result.secure_url,
    storage: 'cloudinary',
    fileName: result.public_id
  };
};

const getDepartmentName = async (departmentId) => {
  if (!departmentId) return null;
  const [departments] = await db.query('SELECT name FROM departments WHERE id = ?', [departmentId]);
  if (departments.length === 0) {
    return null;
  }
  return departments[0].name;
};

const departmentExpenseController = {
  createDepartmentExpense: async (req, res) => {
    try {
      const { description, amount, department_id, department_name } = req.body;

      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, error: 'Description is required' });
      }

      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Supporting document is required' });
      }

      let resolvedDepartmentId = department_id ? parseInt(department_id, 10) : null;
      if (Number.isNaN(resolvedDepartmentId)) {
        resolvedDepartmentId = null;
      }
      let resolvedDepartmentName =
        (department_name && department_name.trim()) ||
        (req.user && req.user.department) ||
        null;

      if (!resolvedDepartmentName && resolvedDepartmentId) {
        resolvedDepartmentName = await getDepartmentName(resolvedDepartmentId);
      }

      const uploadInfo = await uploadFile(req.file);

      const [result] = await db.query(
        `INSERT INTO department_expenses
          (department_id, department_name, description, amount, document_url, document_name, document_storage, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resolvedDepartmentId,
          resolvedDepartmentName,
          description.trim(),
          parsedAmount,
          uploadInfo.url,
          req.file.originalname,
          uploadInfo.storage,
          req.user?.id || null
        ]
      );

      const [rows] = await db.query(
        `SELECT de.*, s.name AS uploaded_by_name
         FROM department_expenses de
         LEFT JOIN staff s ON de.uploaded_by = s.id
         WHERE de.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Department expense uploaded successfully',
        data: rows[0]
      });
    } catch (error) {
      console.error('Error uploading department expense:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload department expense',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  listDepartmentExpenses: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

      // Check if approval columns exist
      const [columns] = await db.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'department_expenses' 
         AND COLUMN_NAME IN ('hr_approved_by', 'finance_approved_by')`
      );

      const hasApprovalColumns = columns.length > 0;

      let query;
      if (hasApprovalColumns) {
        query = `SELECT de.*, 
                        s.name AS uploaded_by_name,
                        hr_approver.name AS hr_approved_by_name,
                        finance_approver.name AS finance_approved_by_name
                 FROM department_expenses de
                 LEFT JOIN staff s ON de.uploaded_by = s.id
                 LEFT JOIN staff hr_approver ON de.hr_approved_by = hr_approver.id
                 LEFT JOIN staff finance_approver ON de.finance_approved_by = finance_approver.id
                 ORDER BY de.created_at DESC
                 LIMIT ${limit}`;
      } else {
        query = `SELECT de.*, 
                        s.name AS uploaded_by_name
                 FROM department_expenses de
                 LEFT JOIN staff s ON de.uploaded_by = s.id
                 ORDER BY de.created_at DESC
                 LIMIT ${limit}`;
      }

      const [rows] = await db.query(query);

      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching department expenses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch department expenses'
      });
    }
  },

  approveByHR: async (req, res) => {
    try {
      const { id } = req.params;
      const { reject, rejection_reason } = req.body;
      const approverId = req.user?.id;

      if (!approverId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Check if user is in HR department
      const [userStaff] = await db.query(
        `SELECT s.*, md.name as department_name 
         FROM staff s 
         LEFT JOIN my_departments md ON s.department_id = md.id 
         WHERE s.id = ?`,
        [approverId]
      );

      if (userStaff.length === 0) {
        return res.status(404).json({ success: false, error: 'Staff record not found' });
      }

      const userDept = userStaff[0].department_name || userStaff[0].department || '';
      if (!userDept.toLowerCase().includes('hr') && !userDept.toLowerCase().includes('human resource')) {
        return res.status(403).json({ success: false, error: 'Only HR department can approve at this stage' });
      }

      if (reject) {
        // Reject expense
        await db.query(
          `UPDATE department_expenses 
           SET hr_rejected = TRUE, 
               rejection_reason = ?,
               hr_approved_at = NOW()
           WHERE id = ?`,
          [rejection_reason || 'Rejected by HR', id]
        );
      } else {
        // Approve by HR
        await db.query(
          `UPDATE department_expenses 
           SET hr_approved = TRUE, 
               hr_approved_by = ?,
               hr_approved_at = NOW(),
               hr_rejected = FALSE
           WHERE id = ?`,
          [approverId, id]
        );
      }

      const [updated] = await db.query(
        `SELECT de.*, 
                s.name AS uploaded_by_name,
                hr_approver.name AS hr_approved_by_name,
                finance_approver.name AS finance_approved_by_name
         FROM department_expenses de
         LEFT JOIN staff s ON de.uploaded_by = s.id
         LEFT JOIN staff hr_approver ON de.hr_approved_by = hr_approver.id
         LEFT JOIN staff finance_approver ON de.finance_approved_by = finance_approver.id
         WHERE de.id = ?`,
        [id]
      );

      res.json({
        success: true,
        message: reject ? 'Expense rejected by HR' : 'Expense approved by HR',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error approving expense by HR:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve expense'
      });
    }
  },

  approveByFinance: async (req, res) => {
    try {
      const { id } = req.params;
      const { reject, rejection_reason } = req.body;
      const approverId = req.user?.id;

      if (!approverId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      // Check if expense is already approved by HR
      const [expense] = await db.query(
        'SELECT hr_approved, hr_rejected FROM department_expenses WHERE id = ?',
        [id]
      );

      if (expense.length === 0) {
        return res.status(404).json({ success: false, error: 'Expense not found' });
      }

      if (!expense[0].hr_approved && !expense[0].hr_rejected) {
        return res.status(400).json({ success: false, error: 'Expense must be approved by HR first' });
      }

      if (expense[0].hr_rejected) {
        return res.status(400).json({ success: false, error: 'Cannot approve expense that was rejected by HR' });
      }

      // Check if user is in Finance department
      const [userStaff] = await db.query(
        `SELECT s.*, md.name as department_name 
         FROM staff s 
         LEFT JOIN my_departments md ON s.department_id = md.id 
         WHERE s.id = ?`,
        [approverId]
      );

      if (userStaff.length === 0) {
        return res.status(404).json({ success: false, error: 'Staff record not found' });
      }

      const userDept = userStaff[0].department_name || userStaff[0].department || '';
      if (!userDept.toLowerCase().includes('finance') && !userDept.toLowerCase().includes('accounting')) {
        return res.status(403).json({ success: false, error: 'Only Finance department can approve at this stage' });
      }

      if (reject) {
        // Reject expense
        await db.query(
          `UPDATE department_expenses 
           SET finance_rejected = TRUE, 
               rejection_reason = ?,
               finance_approved_at = NOW()
           WHERE id = ?`,
          [rejection_reason || 'Rejected by Finance', id]
        );
      } else {
        // Approve by Finance
        await db.query(
          `UPDATE department_expenses 
           SET finance_approved = TRUE, 
               finance_approved_by = ?,
               finance_approved_at = NOW(),
               finance_rejected = FALSE
           WHERE id = ?`,
          [approverId, id]
        );
      }

      const [updated] = await db.query(
        `SELECT de.*, 
                s.name AS uploaded_by_name,
                hr_approver.name AS hr_approved_by_name,
                finance_approver.name AS finance_approved_by_name
         FROM department_expenses de
         LEFT JOIN staff s ON de.uploaded_by = s.id
         LEFT JOIN staff hr_approver ON de.hr_approved_by = hr_approver.id
         LEFT JOIN staff finance_approver ON de.finance_approved_by = finance_approver.id
         WHERE de.id = ?`,
        [id]
      );

      res.json({
        success: true,
        message: reject ? 'Expense rejected by Finance' : 'Expense approved by Finance',
        data: updated[0]
      });
    } catch (error) {
      console.error('Error approving expense by Finance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve expense'
      });
    }
  }
};

module.exports = departmentExpenseController;


