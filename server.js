const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Set timezone to UTC to ensure consistent time handling across environments
process.env.TZ = 'UTC';
process.env.NODE_TZ = 'UTC';

// Try to require database and other modules, but don't crash if they fail
let db, staffController, roleController, multer, upload, uploadController, teamController, clientController, branchController, serviceChargeController, journeyPlanController, payrollRoutes, financialRoutes, staffRoutes, chatRoutes, clientRoutes, salesRoutes, managerRoutes, noticeRoutes, salesRepLeaveRoutes, calendarTaskRoutes, userRoutes, loginHistoryRoutes, journeyPlanRoutes, riderRoutes, myVisibilityReportRoutes, feedbackReportRoutes, availabilityReportRoutes, leaveRequestRoutes, supplierRoutes, receiptRoutes, myAssetsRoutes, faultyProductsRoutes, storeRoutes;

try {
  db = require('./database/db');
  staffController = require('./controllers/staffController');
  roleController = require('./controllers/roleController');
  multer = require('multer');
  upload = multer({ dest: 'uploads/' });
  uploadController = require('./controllers/uploadController');
  teamController = require('./controllers/teamController');
  clientController = require('./controllers/clientController');
  branchController = require('./controllers/branchController');
  serviceChargeController = require('./controllers/serviceChargeController');
  journeyPlanController = require('./controllers/journeyPlanController');
  payrollRoutes = require('./routes/payrollRoutes');
  financialRoutes = require('./routes/financialRoutes');
  staffRoutes = require('./routes/staffRoutes');
  chatRoutes = require('./routes/chatRoutes');
  clientRoutes = require('./routes/clientRoutes');
  salesRoutes = require('./routes/salesRoutes');
  managerRoutes = require('./routes/managerRoutes');
  noticeRoutes = require('./routes/noticeRoutes');
  salesRepLeaveRoutes = require('./routes/leaveRoutes');
  calendarTaskRoutes = require('./routes/calendarTaskRoutes');
  userRoutes = require('./routes/userRoutes');
  loginHistoryRoutes = require('./routes/loginHistoryRoutes');
  journeyPlanRoutes = require('./routes/journeyPlanRoutes');
  salesRepRoutes = require('./routes/salesRepRoutes');
  riderRoutes = require('./routes/riderRoutes');
  myVisibilityReportRoutes = require('./routes/myVisibilityReportRoutes');
  feedbackReportRoutes = require('./routes/feedbackReportRoutes');
  availabilityReportRoutes = require('./routes/availabilityReportRoutes');
  leaveRequestRoutes = require('./routes/leaveRequestRoutes');
  supplierRoutes = require('./routes/supplierRoutes');
  receiptRoutes = require('./routes/receiptRoutes');
  myAssetsRoutes = require('./routes/myAssetsRoutes');
  faultyProductsRoutes = require('./routes/faultyProductsRoutes');
  storeRoutes = require('./routes/storeRoutes');
  assetAssignmentRoutes = require('./routes/assetAssignmentRoutes');
  merchandiseRoutes = require('./routes/merchandiseRoutes');
} catch (error) {
  console.log('Some modules failed to load:', error.message);
}

const app = express();

// Move CORS middleware to the very top - TEMPORARILY ALLOW ALL ORIGINS
const corsOptions = {
  origin: true, // Allow all origins temporarily
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Global error handler to prevent crashes
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (no database required)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString() 
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Debug endpoint to check environment variables
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'Debug info',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    hasDbHost: !!process.env.DB_HOST,
    hasDbUser: !!process.env.DB_USER,
    hasDbPassword: !!process.env.DB_PASSWORD,
    hasDbName: !!process.env.DB_NAME,
    hasJwtSecret: !!process.env.JWT_SECRET,
    envVars: Object.keys(process.env).filter(key => key.startsWith('DB_') || key.startsWith('JWT_') || key.startsWith('CLOUDINARY_')),
    modulesLoaded: {
      db: !!db,
      staffController: !!staffController,
      riderRoutes: !!riderRoutes,
      financialRoutes: !!financialRoutes
    }
  });
});

// Middleware
app.use(express.json());

// Only register routes if modules loaded successfully
if (riderRoutes) {
  app.use('/api/riders', riderRoutes);
}

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));
app.use('/uploads/contracts', express.static(path.join(__dirname, 'uploads', 'contracts')));
app.use('/uploads/termination_letters', express.static(path.join(__dirname, 'uploads', 'termination_letters')));
app.use('/uploads/warning_letters', express.static(path.join(__dirname, 'uploads', 'warning_letters')));

// Register all specific endpoints FIRST
app.use('/api/my-visibility-reports', myVisibilityReportRoutes);
app.use('/api/feedback-reports', feedbackReportRoutes);
app.use('/api/availability-reports', availabilityReportRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);

// Helper function to map database fields to frontend fields
const mapRequestFields = (request) => {
  return {
    id: request.id,
    userId: request.user_id,
    userName: request.user_name,
    serviceTypeId: request.service_type_id,
    pickupLocation: request.pickup_location,
    deliveryLocation: request.delivery_location,
    pickupDate: request.pickup_date,
    description: request.description,
    priority: request.priority,
    status: request.status,
    myStatus: request.my_status,
    createdAt: request.created_at,
    updatedAt: request.updated_at
  };
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt received:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get staff from database by name
    console.log('Querying database for staff by name:', username);
    const [staff] = await db.query(
      'SELECT * FROM staff WHERE name = ?',
      [username]
    );

    console.log('Database query result:', staff);

    if (staff.length === 0) {
      console.log('No staff found with name:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = staff[0];

    if (!user.password) {
      console.log('No password set for this staff member:', username);
      return res.status(401).json({ message: 'No password set for this staff member' });
    }

    // Compare password
    console.log('Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for staff:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    console.log('Creating JWT token for staff:', username);
    const token = jwt.sign(
      { 
        userId: user.id,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for staff:', username);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.business_email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Service Types routes
app.get('/api/service-types', async (req, res) => {
  try {
    const [serviceTypes] = await db.query(
      'SELECT * FROM service_types ORDER BY name'
    );
    res.json(serviceTypes);
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/service-types/:id', async (req, res) => {
  try {
    const [serviceTypes] = await db.query(
      'SELECT * FROM service_types WHERE id = ?',
      [req.params.id]
    );

    if (serviceTypes.length === 0) {
      return res.status(404).json({ message: 'Service type not found' });
    }

    res.json(serviceTypes[0]);
  } catch (error) {
    console.error('Error fetching service type:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Requests routes
app.get('/api/requests', async (req, res) => {
  try {
    const { status, myStatus } = req.query;
    let query = 'SELECT * FROM requests';
    const params = [];

    // Add filters if provided
    if (status || myStatus !== undefined) {
      query += ' WHERE';
      if (status) {
        query += ' status = ?';
        params.push(status);
      }
      if (myStatus !== undefined) {
        if (status) query += ' AND';
        query += ' my_status = ?';
        params.push(myStatus);
      }
    }

    query += ' ORDER BY created_at DESC';
    
    const [requests] = await db.query(query, params);
    res.json(requests.map(mapRequestFields));
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { 
      userId, 
      userName, 
      serviceTypeId,
      pickupLocation, 
      deliveryLocation, 
      pickupDate, 
      description, 
      priority,
      myStatus = 0
    } = req.body;

    console.log('Received request data:', {
      userId,
      userName,
      serviceTypeId,
      pickupLocation,
      deliveryLocation,
      pickupDate,
      description,
      priority,
      myStatus
    });

    // Validate required fields
    if (!userId || !userName || !serviceTypeId || !pickupLocation || !deliveryLocation || !pickupDate) {
      console.log('Missing required fields:', {
        userId: !userId,
        userName: !userName,
        serviceTypeId: !serviceTypeId,
        pickupLocation: !pickupLocation,
        deliveryLocation: !deliveryLocation,
        pickupDate: !pickupDate
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if service type exists
    const [serviceTypes] = await db.query(
      'SELECT id FROM service_types WHERE id = ?',
      [serviceTypeId]
    );

    if (serviceTypes.length === 0) {
      console.error('Service type not found:', serviceTypeId);
      return res.status(400).json({ message: 'Invalid service type' });
    }

    // Check if staff exists
    const [staff] = await db.query(
      'SELECT id FROM staff WHERE id = ?',
      [userId]
    );

    if (staff.length === 0) {
      console.error('Staff not found:', userId);
      return res.status(400).json({ message: 'Invalid staff member' });
    }

    // Insert request into database
    const [result] = await db.query(
      'INSERT INTO requests (user_id, user_name, service_type_id, pickup_location, delivery_location, pickup_date, description, priority, status, my_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, userName, serviceTypeId, pickupLocation, deliveryLocation, pickupDate, description || null, priority || 'medium', 'pending', myStatus]
    );

    // Get the created request
    const [requests] = await db.query(
      'SELECT * FROM requests WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(mapRequestFields(requests[0]));
  } catch (error) {
    console.error('Error creating request:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Map frontend field names to database field names
    const dbUpdates = {
      user_name: updates.userName,
      service_type_id: updates.serviceTypeId,
      pickup_location: updates.pickupLocation,
      delivery_location: updates.deliveryLocation,
      pickup_date: updates.pickupDate,
      description: updates.description,
      priority: updates.priority,
      status: updates.status,
      my_status: updates.myStatus
    };

    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => 
      dbUpdates[key] === undefined && delete dbUpdates[key]
    );

    // Build the SET clause dynamically based on provided updates
    const setClause = Object.keys(dbUpdates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(dbUpdates), id];

    await db.query(
      `UPDATE requests SET ${setClause} WHERE id = ?`,
      values
    );

    // Get the updated request
    const [requests] = await db.query(
      'SELECT * FROM requests WHERE id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(mapRequestFields(requests[0]));
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Staff routes
app.get('/api/staff', staffController.getAllStaff);
app.get('/api/staff/:id', staffController.getStaffById);
app.post('/api/staff', staffController.createStaff);
app.put('/api/staff/:id', staffController.updateStaff);
app.delete('/api/staff/:id', staffController.deleteStaff);
app.patch('/api/staff/:id/status', staffController.updateStaffStatus);

// Roles routes
app.get('/api/roles', roleController.getAllRoles);

// Upload routes
app.post('/api/upload', upload.single('photo'), uploadController.uploadImage);

// Team routes
app.post('/api/teams', teamController.createTeam);
app.get('/api/teams', teamController.getTeams);

// Client routes
app.use('/api/clients', clientRoutes);
app.get('/api/clients/:clientId/branches', branchController.getAllBranches);
app.post('/api/clients/:clientId/branches', branchController.createBranch);
app.put('/api/clients/:clientId/branches/:branchId', branchController.updateBranch);
app.delete('/api/clients/:clientId/branches/:branchId', branchController.deleteBranch);
app.get('/api/clients/:clientId/service-charges', serviceChargeController.getServiceCharges);
app.post('/api/clients/:clientId/service-charges', serviceChargeController.createServiceCharge);
app.put('/api/clients/:clientId/service-charges/:chargeId', serviceChargeController.updateServiceCharge);
app.delete('/api/clients/:clientId/service-charges/:chargeId', serviceChargeController.deleteServiceCharge);

// Journey Plan routes
app.use('/api/journey-plans', journeyPlanRoutes);

// Sales Representative routes
app.use('/api/sales-reps', salesRepRoutes);



// Financial System Routes
console.log('Registering financial routes at /api/financial');
app.use('/api/financial', financialRoutes);
console.log('Financial routes registered successfully');
app.use('/api/payroll', payrollRoutes);
app.use('/api', staffRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api', supplierRoutes);
app.use('/api', receiptRoutes);
app.use('/api/my-assets', myAssetsRoutes);
  app.use('/api/faulty-products', faultyProductsRoutes);
  app.use('/api/stores', storeRoutes);
  app.use('/api/asset-assignments', assetAssignmentRoutes);
  app.use('/api/merchandise', merchandiseRoutes);
app.use('/api', clientRoutes);
app.use('/api/sales-rep-leaves', salesRepLeaveRoutes);
app.use('/api/calendar-tasks', calendarTaskRoutes);
app.use('/api/users', userRoutes);

// Visibility Reports route
app.get('/api/visibility-reports', async (req, res) => {
  try {
    console.log('Visibility reports route hit!');
    
    const { startDate, endDate, currentDate, page = 1, limit = 10, country, salesRep, search } = req.query;
    const isViewAll = parseInt(limit) === -1;
    const offset = isViewAll ? 0 : (parseInt(page) - 1) * parseInt(limit);
    
    let sql = `
      SELECT vr.id, vr.reportId, vr.comment, vr.imageUrl, vr.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON vr.userId = u.id
    `;
    
    let countSql = `
      SELECT COUNT(*) as total
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON vr.userId = u.id
    `;
    
    const params = [];
    const countParams = [];
    let whereConditions = [];
    
    // If currentDate is provided, filter by current date first
    if (currentDate) {
      whereConditions.push(`DATE(vr.createdAt) = ?`);
      params.push(currentDate);
      countParams.push(currentDate);
    }
    // If date range is provided, filter by date range
    else if (startDate && endDate) {
      whereConditions.push(`DATE(vr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }
    // If only startDate is provided, filter from that date onwards
    else if (startDate) {
      whereConditions.push(`DATE(vr.createdAt) >= ?`);
      params.push(startDate);
      countParams.push(startDate);
    }
    // If only endDate is provided, filter up to that date
    else if (endDate) {
      whereConditions.push(`DATE(vr.createdAt) <= ?`);
      params.push(endDate);
      countParams.push(endDate);
    }
    
    // Add country filter
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
      countParams.push(country);
    }
    
    // Add sales rep filter
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
      countParams.push(salesRep);
    }
    
    // Add search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR vr.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }
    
    sql += ` ORDER BY vr.createdAt DESC`;
    
    // Add LIMIT and OFFSET only if not viewing all
    if (!isViewAll) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
    }
    
    const [results] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;
    
    res.json({ 
      success: true, 
      data: results,
      pagination: {
        page: isViewAll ? 1 : parseInt(page),
        limit: isViewAll ? total : parseInt(limit),
        total,
        totalPages: isViewAll ? 1 : Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching visibility reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Visibility Reports CSV Export route
app.get('/api/visibility-reports/export', async (req, res) => {
  try {
    console.log('Visibility reports CSV export route hit!');
    
    const { startDate, endDate, currentDate, country, salesRep, search } = req.query;
    
    let sql = `
      SELECT vr.id, vr.reportId, vr.comment, vr.imageUrl, vr.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON vr.userId = u.id
    `;
    
    const params = [];
    let whereConditions = [];
    
    // If currentDate is provided, filter by current date first
    if (currentDate) {
      whereConditions.push(`DATE(vr.createdAt) = ?`);
      params.push(currentDate);
    }
    // If date range is provided, filter by date range
    else if (startDate && endDate) {
      whereConditions.push(`DATE(vr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }
    // If only startDate is provided, filter from that date onwards
    else if (startDate) {
      whereConditions.push(`DATE(vr.createdAt) >= ?`);
      params.push(startDate);
    }
    // If only endDate is provided, filter up to that date
    else if (endDate) {
      whereConditions.push(`DATE(vr.createdAt) <= ?`);
      params.push(endDate);
    }
    
    // Add country filter
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
    }
    
    // Add sales rep filter
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
    }
    
    // Add search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR vr.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    sql += ` ORDER BY vr.createdAt DESC`;
    
    const [results] = await db.query(sql, params);
    
    // Create CSV header information
    const exportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let filterDate;
    if (currentDate) {
      filterDate = new Date(currentDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const end = new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      filterDate = startDate === endDate ? start : `${start} - ${end}`;
    } else if (startDate) {
      filterDate = `From ${new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else if (endDate) {
      filterDate = `Until ${new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else {
      filterDate = 'All Dates';
    }
    
    const reportCount = results.length;
    
    // Create CSV content with header information
    const csvHeader = [
      ['Visibility Reports Export'],
      [''],
      ['Export Date:', exportDate],
      ['Filter Date:', filterDate],
      ['Filter Country:', country && country !== 'all' ? country : 'All Countries'],
      ['Filter Sales Rep:', salesRep && salesRep !== 'all' ? salesRep : 'All Sales Reps'],
      ['Filter Search:', search && search.trim() ? search.trim() : 'No Search'],
      ['Total Reports:', reportCount.toString()],
      [''],
      ['ID', 'Report ID', 'Outlet', 'Country', 'Sales Rep', 'Comment', 'Image URL', 'Created At']
    ];
    
    const csvData = results.map(row => [
      row.id,
      row.reportId,
      row.outlet || 'N/A',
      row.country || 'N/A',
      row.salesRep || 'N/A',
      row.comment || 'N/A',
      row.imageUrl || 'N/A',
      new Date(row.createdAt).toLocaleString()
    ]);
    
    const csvContent = [...csvHeader, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    // Set headers for CSV download
    const filename = `visibility-reports-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting visibility reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available countries for filtering
app.get('/api/countries', async (req, res) => {
  try {
    console.log('Countries route hit!');
    
    const sql = `
      SELECT DISTINCT co.id, co.name
      FROM Country co
      INNER JOIN Clients c ON c.countryId = co.id
      INNER JOIN VisibilityReport vr ON vr.clientId = c.id
      ORDER BY co.name ASC
    `;
    
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching countries:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/regions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT name FROM Regions ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available sales reps for filtering
app.get('/api/sales-reps', async (req, res) => {
  try {
    console.log('Sales reps route hit!');
    
    const sql = `
      SELECT DISTINCT u.id, u.name
      FROM SalesRep u
      INNER JOIN VisibilityReport vr ON vr.userId = u.id
      ORDER BY u.name ASC
    `;
    
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching sales reps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Feedback Reports route
app.get('/api/feedback-reports', async (req, res) => {
  try {
    console.log('Feedback reports route hit!');
    
    const { startDate, endDate, currentDate, page = 1, limit = 10, country, salesRep, search } = req.query;
    const isViewAll = parseInt(limit) === -1;
    const offset = isViewAll ? 0 : (parseInt(page) - 1) * parseInt(limit);
    
    let sql = `
      SELECT fr.id, fr.reportId, fr.comment, fr.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM FeedbackReport fr
      LEFT JOIN Clients c ON fr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON fr.userId = u.id
    `;
    
    let countSql = `
      SELECT COUNT(*) as total
      FROM FeedbackReport fr
      LEFT JOIN Clients c ON fr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON fr.userId = u.id
    `;
    
    const params = [];
    const countParams = [];
    let whereConditions = [];
    
    // If currentDate is provided, filter by current date first
    if (currentDate) {
      whereConditions.push(`DATE(fr.createdAt) = ?`);
      params.push(currentDate);
      countParams.push(currentDate);
    }
    // If date range is provided, filter by date range
    else if (startDate && endDate) {
      whereConditions.push(`DATE(fr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }
    // If only startDate is provided, filter from that date onwards
    else if (startDate) {
      whereConditions.push(`DATE(fr.createdAt) >= ?`);
      params.push(startDate);
      countParams.push(startDate);
    }
    // If only endDate is provided, filter up to that date
    else if (endDate) {
      whereConditions.push(`DATE(fr.createdAt) <= ?`);
      params.push(endDate);
      countParams.push(endDate);
    }
    
    // Add country filter
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
      countParams.push(country);
    }
    
    // Add sales rep filter
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
      countParams.push(salesRep);
    }
    
    // Add search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR fr.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }
    
    sql += ` ORDER BY fr.createdAt DESC`;
    
    // Add LIMIT and OFFSET only if not viewing all
    if (!isViewAll) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
    }
    
    const [results] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;
    
    res.json({ 
      success: true, 
      data: results,
      pagination: {
        page: isViewAll ? 1 : parseInt(page),
        limit: isViewAll ? total : parseInt(limit),
        total,
        totalPages: isViewAll ? 1 : Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching feedback reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Feedback Reports CSV Export route
app.get('/api/feedback-reports/export', async (req, res) => {
  try {
    console.log('Feedback reports CSV export route hit!');
    
    const { startDate, endDate, currentDate, country, salesRep, search } = req.query;
    
    let sql = `
      SELECT fr.id, fr.reportId, fr.comment, fr.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM FeedbackReport fr
      LEFT JOIN Clients c ON fr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON fr.userId = u.id
    `;
    
    const params = [];
    let whereConditions = [];
    
    // If currentDate is provided, filter by current date first
    if (currentDate) {
      whereConditions.push(`DATE(fr.createdAt) = ?`);
      params.push(currentDate);
    }
    // If date range is provided, filter by date range
    else if (startDate && endDate) {
      whereConditions.push(`DATE(fr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }
    // If only startDate is provided, filter from that date onwards
    else if (startDate) {
      whereConditions.push(`DATE(fr.createdAt) >= ?`);
      params.push(startDate);
    }
    // If only endDate is provided, filter up to that date
    else if (endDate) {
      whereConditions.push(`DATE(fr.createdAt) <= ?`);
      params.push(endDate);
    }
    
    // Add country filter
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
    }
    
    // Add sales rep filter
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
    }
    
    // Add search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR fr.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    sql += ` ORDER BY fr.createdAt DESC`;
    
    const [results] = await db.query(sql, params);
    
    // Create CSV header information
    const exportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let filterDate;
    if (currentDate) {
      filterDate = new Date(currentDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const end = new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      filterDate = startDate === endDate ? start : `${start} - ${end}`;
    } else if (startDate) {
      filterDate = `From ${new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else if (endDate) {
      filterDate = `Until ${new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else {
      filterDate = 'All Dates';
    }
    
    const reportCount = results.length;
    
    // Create CSV content with header information
    const csvHeader = [
      ['Feedback Reports Export'],
      [''],
      ['Export Date:', exportDate],
      ['Filter Date:', filterDate],
      ['Filter Country:', country && country !== 'all' ? country : 'All Countries'],
      ['Filter Sales Rep:', salesRep && salesRep !== 'all' ? salesRep : 'All Sales Reps'],
      ['Filter Search:', search && search.trim() ? search.trim() : 'No Search'],
      ['Total Reports:', reportCount.toString()],
      [''],
      ['ID', 'Report ID', 'Outlet', 'Country', 'Sales Rep', 'Comment', 'Created At']
    ];
    
    const csvData = results.map(row => [
      row.id,
      row.reportId,
      row.outlet || 'N/A',
      row.country || 'N/A',
      row.salesRep || 'N/A',
      row.comment || 'N/A',
      new Date(row.createdAt).toLocaleString()
    ]);
    
    const csvContent = [...csvHeader, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    // Set headers for CSV download
    const filename = `feedback-reports-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting feedback reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available countries for feedback filtering
app.get('/api/feedback-countries', async (req, res) => {
  try {
    console.log('Feedback countries route hit!');
    
    const sql = `
      SELECT DISTINCT co.id, co.name
      FROM Country co
      INNER JOIN Clients c ON c.countryId = co.id
      INNER JOIN FeedbackReport fr ON fr.clientId = c.id
      ORDER BY co.name ASC
    `;
    
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching feedback countries:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available sales reps for feedback filtering
app.get('/api/feedback-sales-reps', async (req, res) => {
  try {
    console.log('Feedback sales reps route hit!');
    
    const sql = `
      SELECT DISTINCT u.id, u.name
      FROM SalesRep u
      INNER JOIN FeedbackReport fr ON fr.userId = u.id
      ORDER BY u.name ASC
    `;
    
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error fetching feedback sales reps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Availability Reports CSV Export route
app.get('/api/availability-reports/export', async (req, res) => {
  try {
    console.log('Availability reports CSV export route hit!');
    
    const { startDate, endDate, currentDate, outlet, comment, country, salesRep, search } = req.query;
    
    let sql = `
      SELECT pr.id, pr.reportId, pr.productName, pr.quantity, pr.comment, pr.createdAt,
             c.name AS clientName, co.name AS countryName, u.name AS salesRepName
      FROM ProductReport pr
      LEFT JOIN Clients c ON pr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON pr.userId = u.id
    `;
    
    const params = [];
    let whereConditions = [];
    
    // If currentDate is provided, filter by current date first
    if (currentDate) {
      whereConditions.push(`DATE(pr.createdAt) = ?`);
      params.push(currentDate);
    }
    // If date range is provided, filter by date range
    else if (startDate && endDate) {
      whereConditions.push(`DATE(pr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }
    // If only startDate is provided, filter from that date onwards
    else if (startDate) {
      whereConditions.push(`DATE(pr.createdAt) >= ?`);
      params.push(startDate);
    }
    // If only endDate is provided, filter up to that date
    else if (endDate) {
      whereConditions.push(`DATE(pr.createdAt) <= ?`);
      params.push(endDate);
    }
    
    // Add outlet filter
    if (outlet && outlet.trim()) {
      whereConditions.push(`c.name LIKE ?`);
      params.push(`%${outlet.trim()}%`);
    }
    
    // Add comment filter
    if (comment && comment.trim()) {
      whereConditions.push(`pr.comment LIKE ?`);
      params.push(`%${comment.trim()}%`);
    }
    
    // Add country filter
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
    }
    
    // Add sales rep filter
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
    }
    
    // Add search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR pr.comment LIKE ? OR pr.productName LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add WHERE clause if there are conditions
    if (whereConditions.length > 0) {
      sql += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    sql += ` ORDER BY pr.createdAt DESC`;
    
    const [results] = await db.query(sql, params);
    
    // Create CSV header information
    const exportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let filterDate;
    if (currentDate) {
      filterDate = new Date(currentDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const end = new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      filterDate = startDate === endDate ? start : `${start} - ${end}`;
    } else if (startDate) {
      filterDate = `From ${new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else if (endDate) {
      filterDate = `Until ${new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else {
      filterDate = 'All Dates';
    }
    
    const reportCount = results.length;
    
    // Create CSV content with header information
    const csvHeader = [
      ['Availability Reports Export'],
      [''],
      ['Export Date:', exportDate],
      ['Filter Date:', filterDate],
      ['Filter Outlet:', outlet && outlet.trim() ? outlet.trim() : 'All Outlets'],
      ['Filter Comment:', comment && comment.trim() ? comment.trim() : 'All Comments'],
      ['Filter Country:', country && country !== 'all' ? country : 'All Countries'],
      ['Filter Sales Rep:', salesRep && salesRep !== 'all' ? salesRep : 'All Sales Reps'],
      ['Filter Search:', search && search.trim() ? search.trim() : 'No Search'],
      ['Total Reports:', reportCount.toString()],
      [''],
      ['ID', 'Report ID', 'Product Name', 'Quantity', 'Client', 'Country', 'Sales Rep', 'Comment', 'Created At']
    ];
    
    const csvData = results.map(row => [
      row.id,
      row.reportId,
      row.productName || 'N/A',
      row.quantity || 'N/A',
      row.clientName || 'N/A',
      row.countryName || 'N/A',
      row.salesRepName || 'N/A',
      row.comment || 'N/A',
      new Date(row.createdAt).toLocaleString()
    ]);
    
    const csvContent = [...csvHeader, ...csvData]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    // Set headers for CSV download
    const filename = `availability-reports-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);
  } catch (err) {
    console.error('Error exporting availability reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available countries for availability filtering
app.get('/api/availability-countries', async (req, res) => {
  try {
    console.log('Availability countries route hit!');
    
    const sql = `
      SELECT DISTINCT co.name
      FROM Country co
      INNER JOIN Clients c ON c.countryId = co.id
      INNER JOIN ProductReport pr ON pr.clientId = c.id
      ORDER BY co.name ASC
    `;
    
    const [results] = await db.query(sql);
    const countries = results.map(row => row.name);
    res.json(countries);
  } catch (err) {
    console.error('Error fetching availability countries:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available sales reps for availability filtering
app.get('/api/availability-sales-reps', async (req, res) => {
  try {
    console.log('Availability sales reps route hit!');
    
    const sql = `
      SELECT DISTINCT u.name
      FROM SalesRep u
      INNER JOIN ProductReport pr ON pr.userId = u.id
      ORDER BY u.name ASC
    `;
    
    const [results] = await db.query(sql);
    const salesReps = results.map(row => row.name);
    res.json(salesReps);
  } catch (err) {
    console.error('Error fetching availability sales reps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Example API endpoint
app.get('/api/test', (req, res) => {
  db.query('SELECT 1 + 1 AS solution')
    .then(([results]) => {
      res.json({ message: 'Database connection successful', results });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// Test sales orders endpoint
app.get('/api/test-sales-orders', (req, res) => {
  console.log('=== TEST SALES ORDERS ENDPOINT ===');
  res.json({ 
    message: 'Sales orders endpoint is accessible',
    timestamp: new Date().toISOString(),
    routes: {
      'GET /api/financial/sales-orders': 'Get all sales orders',
      'POST /api/financial/sales-orders': 'Create sales order',
      'GET /api/financial/sales-orders/:id': 'Get sales order by ID'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://woosh-client.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO chat logic
io.on('connection', (socket) => {
  // Join a chat room
  socket.on('joinRoom', (roomId) => {
    socket.join(`room_${roomId}`);
  });

  // Leave a chat room
  socket.on('leaveRoom', (roomId) => {
    socket.leave(`room_${roomId}`);
  });

  // Handle sending a message
  socket.on('sendMessage', async (data) => {
    // data: { roomId, message, sender_id, sender_name, sentAt }
    try {
      // Save to database
      const [result] = await db.query(
        'INSERT INTO chat_messages (room_id, sender_id, message) VALUES (?, ?, ?)',
        [data.roomId, data.sender_id, data.message]
      );
      // Fetch the saved message with sender_name and sent_at
      const [rows] = await db.query(
        `SELECT m.*, s.name as sender_name FROM chat_messages m JOIN staff s ON m.sender_id = s.id WHERE m.id = ?`,
        [result.insertId]
      );
      const savedMsg = rows[0];
      io.to(`room_${data.roomId}`).emit('newMessage', savedMsg);
    } catch (err) {
      console.error('Socket sendMessage error:', err);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 