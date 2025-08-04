const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const financialRoutes = require('../routes/financialRoutes');
const salesRoutes = require('../routes/salesRoutes');
const staffRoutes = require('../routes/staffRoutes');
const managerRoutes = require('../routes/managerRoutes');
const clientRoutes = require('../routes/clientRoutes');
const availabilityReportRoutes = require('../routes/availabilityReportRoutes');
const loginHistoryRoutes = require('../routes/loginHistoryRoutes');
const leaveRequestRoutes = require('../routes/leaveRequestRoutes');
const chatRoutes = require('../routes/chatRoutes');
const noticeRoutes = require('../routes/noticeRoutes');
const calendarTaskRoutes = require('../routes/calendarTaskRoutes');
const userRoutes = require('../routes/userRoutes');
const payrollRoutes = require('../routes/payrollRoutes');
const journeyPlanRoutes = require('../routes/journeyPlanRoutes');
const leaveRoutes = require('../routes/leaveRoutes');
const faultyProductsRoutes = require('../routes/faultyProductsRoutes');
const myAssetsRoutes = require('../routes/myAssetsRoutes');
const receiptRoutes = require('../routes/receiptRoutes');
const supplierRoutes = require('../routes/supplierRoutes');
const riderRoutes = require('../routes/riderRoutes');
const storeRoutes = require('../routes/storeRoutes');
const feedbackReportRoutes = require('../routes/feedbackReportRoutes');
const myVisibilityReportRoutes = require('../routes/myVisibilityReportRoutes');
const visibilityReportRoutes = require('../routes/visibilityReportRoutes');

require('dotenv').config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
    'https://moonsunclient.vercel.app',
    'https://moonsunclient-obzh7s26i-bryan-otienos-projects.vercel.app',
    'https://moonsunclient-5ui6x3b92-bryan-otienos-projects.vercel.app',
    'https://moonsunclient-kuxu9lj74-bryan-otienos-projects.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware - Simplified CORS for development
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await db.query('SELECT 1 as test');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
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
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Staff routes
app.get('/api/staff', async (req, res) => {
  try {
    const [staff] = await db.query('SELECT * FROM staff ORDER BY name');
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Store routes
app.get('/api/stores', async (req, res) => {
  try {
    console.log('Fetching stores...');
    const [stores] = await db.query('SELECT * FROM stores');
    console.log('Stores fetched:', stores.length);
    res.json(stores);
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Financial routes
app.use('/api/financial', financialRoutes);

// Sales routes
app.use('/api/sales', salesRoutes);

// Staff routes
app.use('/api/staff', staffRoutes);

// Manager routes
app.use('/api/managers', managerRoutes);

// Client routes
app.use('/api/clients', clientRoutes);

// Availability report routes
app.use('/api/availability', availabilityReportRoutes);

// Login history routes
app.use('/api/login-history', loginHistoryRoutes);

// Leave request routes
app.use('/api/leave-requests', leaveRequestRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Notice routes
app.use('/api/notices', noticeRoutes);

// Calendar task routes
app.use('/api/calendar-tasks', calendarTaskRoutes);

// User routes
app.use('/api/users', userRoutes);

// Payroll routes
app.use('/api/payroll', payrollRoutes);

// Journey plan routes
app.use('/api/journey-plans', journeyPlanRoutes);

// Leave routes
app.use('/api/leaves', leaveRoutes);

// Faulty products routes
app.use('/api/faulty-products', faultyProductsRoutes);

// My assets routes
app.use('/api/my-assets', myAssetsRoutes);

// Receipt routes
app.use('/api/receipts', receiptRoutes);

// Supplier routes
app.use('/api/suppliers', supplierRoutes);

// Rider routes
app.use('/api/riders', riderRoutes);

// Store routes
app.use('/api/stores', storeRoutes);

// Feedback report routes
app.use('/api/feedback-reports', feedbackReportRoutes);

// My visibility report routes
app.use('/api/my-visibility-reports', myVisibilityReportRoutes);

// Visibility report routes
app.use('/api/visibility-reports', visibilityReportRoutes);

// Stock summary endpoint
app.get('/api/financial/stock-summary', async (req, res) => {
  try {
    console.log('Fetching stock summary...');
    
    // Get all stores
    const [stores] = await db.query(
      'SELECT id, store_name, store_code FROM stores'
    );
    console.log('Stores found:', stores.length);

    // Get all products
    const [products] = await db.query(
      'SELECT id, product_name, category FROM products WHERE status = "active" ORDER BY product_name'
    );
    console.log('Products found:', products.length);

    // Get existing stock quantities
    const [stockData] = await db.query(
      'SELECT store_id, product_id, quantity FROM store_inventory'
    );
    console.log('Stock data found:', stockData.length);

    // Create a map for quick lookup
    const stockMap = {};
    stockData.forEach(item => {
      const key = `${item.store_id}-${item.product_id}`;
      stockMap[key] = item.quantity;
    });

    // Build the response
    const response = {
      stores: stores,
      products: products.map(product => ({
        ...product,
        storeQuantities: stores.reduce((acc, store) => {
          const key = `${store.id}-${product.id}`;
          acc[store.id] = stockMap[key] || 0;
          return acc;
        }, {})
      }))
    };

    console.log('Stock summary response built successfully');
    res.json(response);
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Woosh Finance API Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/login',
      staff: '/api/staff',
      stores: '/api/stores',
      stockSummary: '/api/financial/stock-summary'
    }
  });
});

// Catch-all route for unmatched paths
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app; 