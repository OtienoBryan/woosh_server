const express = require('express');
const routesController = require('./controllers/routesController');

// Create a simple test server
const app = express();
app.use(express.json());

// Test the routes controller directly
async function testRoutesAPI() {
  console.log('Testing Routes API...\n');
  
  // Mock request and response objects
  const mockReq = {
    query: { page: 1, limit: 10, search: '' }
  };
  
  const mockRes = {
    json: (data) => {
      console.log('API Response:', JSON.stringify(data, null, 2));
    },
    status: (code) => ({
      json: (data) => {
        console.log(`API Response (${code}):`, JSON.stringify(data, null, 2));
      }
    })
  };
  
  try {
    console.log('Testing getAllRoutes...');
    await routesController.getAllRoutes(mockReq, mockRes);
  } catch (error) {
    console.error('Error testing routes API:', error);
  }
}

testRoutesAPI();
