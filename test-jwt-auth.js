/**
 * JWT Authentication Test Script
 * 
 * This script tests the JWT authentication flow:
 * 1. Tests public endpoints (should work without auth)
 * 2. Tests protected endpoints without token (should fail)
 * 3. Tests login endpoint
 * 4. Tests protected endpoints with token (should work)
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_USERNAME = process.env.TEST_USERNAME || 'admin'; // Change to your test user
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password'; // Change to your test password

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function testPublicEndpoints() {
  log('\n=== Testing Public Endpoints ===', 'cyan');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    if (healthResponse.status === 200) {
      logSuccess('Health endpoint accessible without auth');
    }
  } catch (error) {
    logError(`Health endpoint failed: ${error.message}`);
  }

  try {
    // Test test endpoint
    const testResponse = await axios.get(`${BASE_URL}/api/test`);
    if (testResponse.status === 200) {
      logSuccess('Test endpoint accessible without auth');
    }
  } catch (error) {
    logError(`Test endpoint failed: ${error.message}`);
  }
}

async function testProtectedEndpointsWithoutAuth() {
  log('\n=== Testing Protected Endpoints Without Auth ===', 'cyan');
  
  const protectedEndpoints = [
    '/api/staff',
    '/api/clients',
    '/api/financial/accounts',
    '/api/sales-reps'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      await axios.get(`${BASE_URL}${endpoint}`);
      logError(`${endpoint} - Should have been protected but wasn't!`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logSuccess(`${endpoint} - Properly protected (401 Unauthorized)`);
      } else {
        logWarning(`${endpoint} - Unexpected error: ${error.message}`);
      }
    }
  }
}

async function testLogin() {
  log('\n=== Testing Login Endpoint ===', 'cyan');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD
    });

    if (response.status === 200 && response.data.token) {
      logSuccess('Login successful');
      logInfo(`Token received: ${response.data.token.substring(0, 20)}...`);
      logInfo(`User: ${response.data.user.name} (Role: ${response.data.user.role})`);
      return response.data.token;
    } else {
      logError('Login failed - No token received');
      return null;
    }
  } catch (error) {
    if (error.response) {
      logError(`Login failed: ${error.response.data.message || error.message}`);
    } else {
      logError(`Login failed: ${error.message}`);
    }
    logWarning('Make sure you have set the correct TEST_USERNAME and TEST_PASSWORD');
    return null;
  }
}

async function testProtectedEndpointsWithAuth(token) {
  log('\n=== Testing Protected Endpoints With Auth ===', 'cyan');
  
  if (!token) {
    logError('No token available - skipping authenticated tests');
    return;
  }

  const protectedEndpoints = [
    { url: '/api/staff', name: 'Staff' },
    { url: '/api/clients', name: 'Clients' },
    { url: '/api/financial/accounts', name: 'Accounts' },
    { url: '/api/roles', name: 'Roles' }
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 200) {
        logSuccess(`${endpoint.name} - Accessible with valid token`);
      }
    } catch (error) {
      if (error.response) {
        logError(`${endpoint.name} - Failed: ${error.response.status} ${error.response.statusText}`);
      } else {
        logError(`${endpoint.name} - Failed: ${error.message}`);
      }
    }
  }
}

async function testInvalidToken() {
  log('\n=== Testing Invalid Token ===', 'cyan');
  
  const invalidToken = 'invalid.token.here';
  
  try {
    await axios.get(`${BASE_URL}/api/staff`, {
      headers: {
        'Authorization': `Bearer ${invalidToken}`
      }
    });
    logError('Invalid token was accepted - Security issue!');
  } catch (error) {
    if (error.response && error.response.status === 403) {
      logSuccess('Invalid token properly rejected (403 Forbidden)');
    } else {
      logWarning(`Unexpected error: ${error.message}`);
    }
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     JWT Authentication Test Suite          ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  logInfo(`Testing server at: ${BASE_URL}`);
  logInfo(`Test user: ${TEST_USERNAME}`);
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/api/health`);
  } catch (error) {
    logError('\nServer is not running or not accessible!');
    logInfo(`Please start the server and ensure it's running on ${BASE_URL}`);
    process.exit(1);
  }

  await testPublicEndpoints();
  await testProtectedEndpointsWithoutAuth();
  
  const token = await testLogin();
  
  if (token) {
    await testProtectedEndpointsWithAuth(token);
    await testInvalidToken();
  }
  
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║          Test Suite Completed              ║', 'cyan');
  log('╚════════════════════════════════════════════╝\n', 'cyan');
}

// Run the tests
runTests().catch(error => {
  logError(`\nUnexpected error: ${error.message}`);
  process.exit(1);
});

