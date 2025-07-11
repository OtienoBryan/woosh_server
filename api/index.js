const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database/db');
const staffController = require('./controllers/staffController');
const roleController = require('./controllers/roleController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const uploadController = require('./controllers/uploadController');
const teamController = require('./controllers/teamController');
const clientController = require('./controllers/clientController');
const branchController = require('./controllers/branchController');
const serviceChargeController = require('./controllers/serviceChargeController');
const journeyPlanController = require('./controllers/journeyPlanController');
const sosController = require('./controllers/sosController');
const financialRoutes = require('./routes/financialRoutes');
const staffRoutes = require('./routes/staffRoutes');
const chatRoutes = require('./routes/chatRoutes');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite's default port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());

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

    // Get user from database
    console.log('Querying database for user:', username);
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    console.log('Database query result:', users);

    if (users.length === 0) {
      console.log('No user found with username:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare password
    console.log('Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password comparison result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    console.log('Creating JWT token for user:', username);
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', username);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
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

    // Check if user exists
    const [users] = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.error('User not found:', userId);
      return res.status(400).json({ message: 'Invalid user' });
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

// SOS routes
app.get('/api/sos', async (req, res) => {
  try {
    console.log('SOS route hit');
    const [sosList] = await db.query('SELECT * FROM sos');
    console.log('SOS data:', sosList);
    res.json(sosList);
  } catch (error) {
    console.error('Error in SOS route:', error);
    res.status(500).json({ message: 'Failed to fetch SOS data' });
  }
});

app.get('/api/sos/:id', sosController.getSos);
app.post('/api/sos', sosController.createSos);
app.patch('/api/sos/:id', sosController.updateSos);
app.delete('/api/sos/:id', sosController.deleteSos);

// Financial System Routes
app.use('/api/financial', financialRoutes);
app.use('/api', staffRoutes);
app.use('/api/chat', chatRoutes);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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