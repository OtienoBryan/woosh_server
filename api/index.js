const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const staffController = require('../controllers/staffController');
const roleController = require('../controllers/roleController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const uploadController = require('../controllers/uploadController');
const teamController = require('../controllers/teamController');
const clientController = require('../controllers/clientController');
const branchController = require('../controllers/branchController');
const serviceChargeController = require('../controllers/serviceChargeController');
const journeyPlanController = require('../controllers/journeyPlanController');
const leaveRequestRoutes = require('../routes/leaveRequestRoutes');
const visibilityReportRoutes = require('../routes/visibilityReportRoutes');
const riderRoutes = require('../routes/riderRoutes');

const financialRoutes = require('../routes/financialRoutes');
const staffRoutes = require('../routes/staffRoutes');
const chatRoutes = require('../routes/chatRoutes');

require('dotenv').config();
const cloudinary = require('../config/cloudinary');
const visibilityReportController = require('../controllers/visibilityReportController');
const myVisibilityReportRoutes = require('../routes/myVisibilityReportRoutes');

const app = express();

// CORS configuration - Allow all origins for now to debug
const corsOptions = {
  origin: true, // Allow all origins temporarily
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Register all specific endpoints FIRST
app.use('/api/my-visibility-reports', myVisibilityReportRoutes);

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
      console.log('Missing name or password');
      return res.status(400).json({ message: 'Name and password are required' });
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

app.use('/api/visibility-reports', visibilityReportRoutes); // <-- moved up


// Upload routes
app.post('/api/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Financial System Routes
app.use('/api/financial', financialRoutes);
app.use('/api', staffRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/riders', riderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Catch-all route for unmatched paths
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      root: '/',
      health: '/api/health',
      test: '/api/test',
      auth: '/api/auth/login',
      staff: '/api/staff',
      clients: '/api/clients',
      financial: '/api/financial'
    }
  });
});

// Note: Socket.IO functionality is not available in serverless environment
// For real-time features, consider using external services like Pusher or Socket.io Cloud

// Register all specific endpoints FIRST
app.get('/api/countries', async (req, res) => {
  try {
    const [countries] = await db.query('SELECT id, name FROM Country ORDER BY name');
    res.json({ success: true, data: countries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Team routes
app.post('/api/teams', teamController.createTeam);
app.get('/api/teams', teamController.getTeams);

// Client routes
app.get('/api/clients', clientController.getAllClients);
app.get('/api/clients/:id', clientController.getClient);
app.post('/api/clients', clientController.createClient);
app.put('/api/clients/:id', clientController.updateClient);
app.delete('/api/clients/:id', clientController.deleteClient);
app.get('/api/clients/:clientId/branches', branchController.getAllBranches);
app.post('/api/clients/:clientId/branches', branchController.createBranch);
app.put('/api/clients/:clientId/branches/:branchId', branchController.updateBranch);
app.delete('/api/clients/:clientId/branches/:branchId', branchController.deleteBranch);
app.get('/api/clients/:clientId/service-charges', serviceChargeController.getServiceCharges);
app.post('/api/clients/:clientId/service-charges', serviceChargeController.createServiceCharge);
app.put('/api/clients/:clientId/service-charges/:chargeId', serviceChargeController.updateServiceCharge);
app.delete('/api/clients/:clientId/service-charges/:chargeId', serviceChargeController.deleteServiceCharge);

// Journey Plan routes
app.get('/api/journey-plans', journeyPlanController.getJourneyPlans);
app.get('/api/journey-plans/:id', journeyPlanController.getJourneyPlan);
app.post('/api/journey-plans', journeyPlanController.createJourneyPlan);
app.patch('/api/journey-plans/:id', journeyPlanController.updateJourneyPlan);
app.delete('/api/journey-plans/:id', journeyPlanController.deleteJourneyPlan);


// Test endpoint for debugging
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const [result] = await db.query('SELECT 1 as test');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      cors: {
        origin: req.headers.origin,
        frontendUrl: process.env.FRONTEND_URL
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Example API endpoint (from original server.js)
app.get('/api/test', (req, res) => {
  db.query('SELECT 1 + 1 AS solution')
    .then(([results]) => {
      res.json({ message: 'Database connection successful', results });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
});

// Root endpoint to handle 404s
app.get('/', (req, res) => {
  res.json({ 
    message: 'Woosh Finance API Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      auth: '/api/auth/login',
      staff: '/api/staff',
      clients: '/api/clients',
      financial: '/api/financial'
    }
  });
});

// For serverless deployment, just export the app
module.exports = app; 