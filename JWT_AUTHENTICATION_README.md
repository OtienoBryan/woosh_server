# JWT Authentication Implementation Guide

This document describes the JWT (JSON Web Token) authentication system implemented to secure the API endpoints.

## Overview

The API is now protected using JWT-based authentication. All protected endpoints require a valid JWT token in the Authorization header.

## Features

✅ **Centralized Authentication Middleware** - Single source of truth for authentication logic  
✅ **Token Expiration** - Tokens expire after 24 hours  
✅ **Role-Based Authorization** - Support for checking user roles  
✅ **Secure Token Validation** - Proper error handling for expired/invalid tokens  
✅ **Protected Routes** - All sensitive endpoints are protected  
✅ **Public Endpoints** - Login, health check, and debug endpoints remain public  

## Architecture

### Middleware Location
`server/middleware/auth.js`

Contains three main middleware functions:
1. `authenticateToken` - Verifies JWT and requires valid token
2. `optionalAuth` - Attaches user info if token exists, but doesn't block request
3. `requireRole` - Checks if authenticated user has required role(s)

### Protected Routes

All API routes are protected except:
- `/api/auth/login` - Login endpoint
- `/api/health` - Health check
- `/api/test` - Test endpoint
- `/api/debug` - Debug information

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the server directory (copy from `env.example`):

```bash
cp env.example .env
```

### 2. Generate a Strong JWT Secret

**IMPORTANT:** Never use the default JWT_SECRET in production!

Generate a strong secret using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update your `.env` file:

```env
JWT_SECRET=your_generated_secret_here
```

### 3. Ensure Dependencies are Installed

```bash
npm install
```

Required packages:
- `jsonwebtoken` - JWT creation and verification
- `bcryptjs` - Password hashing
- `express` - Web framework

## Usage

### Client-Side Implementation

#### 1. Login Request

```javascript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password'
  })
});

const data = await response.json();
// Store the token
localStorage.setItem('token', data.token);
```

#### 2. Making Authenticated Requests

Include the token in the Authorization header:

```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:5000/api/staff', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

#### 3. Handling Token Expiration

```javascript
const response = await fetch('http://localhost:5000/api/staff', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('token');
  // Redirect to login page
  window.location.href = '/login';
}
```

### Backend Implementation

#### Using in Route Files

All route files now use the centralized middleware:

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Apply to all routes in this file
router.use(authenticateToken);

// Your routes here
router.get('/', controller.getAll);
router.post('/', controller.create);

module.exports = router;
```

#### Using in server.js for Inline Routes

```javascript
const { authenticateToken } = require('./middleware/auth');

// Protected route
app.get('/api/staff', authenticateToken, staffController.getAllStaff);

// Public route (no middleware)
app.post('/api/auth/login', authController.login);
```

#### Role-Based Authorization

```javascript
const { authenticateToken, requireRole } = require('../middleware/auth');

// Only admins can access
router.delete('/user/:id', authenticateToken, requireRole('admin'), controller.deleteUser);

// Multiple roles allowed
router.get('/reports', authenticateToken, requireRole(['admin', 'manager']), controller.getReports);
```

## Token Structure

The JWT token contains the following payload:

```json
{
  "userId": 123,
  "name": "John Doe",
  "role": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

- `userId` - User's database ID
- `name` - User's name
- `role` - User's role (for authorization)
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp (24 hours from issuance)

## Error Responses

### 401 Unauthorized - No Token
```json
{
  "success": false,
  "error": "Access token required",
  "message": "No authentication token provided"
}
```

### 401 Unauthorized - Token Expired
```json
{
  "success": false,
  "error": "Token expired",
  "message": "Your session has expired. Please login again."
}
```

### 403 Forbidden - Invalid Token
```json
{
  "success": false,
  "error": "Invalid token",
  "message": "Authentication token is invalid"
}
```

### 403 Forbidden - Insufficient Permissions
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "Access denied. Required role: admin"
}
```

## Security Best Practices

### ✅ Implemented

1. **Strong JWT Secret** - Use cryptographically secure random strings
2. **Token Expiration** - Tokens expire after 24 hours
3. **HTTPS Only (Production)** - Always use HTTPS in production
4. **No Sensitive Data in Token** - Only store necessary user info
5. **Centralized Middleware** - Single source of authentication logic
6. **Secure Password Hashing** - Using bcryptjs for password storage

### 📋 Recommended Additional Security

1. **Refresh Tokens** - Implement refresh token mechanism for longer sessions
2. **Token Blacklisting** - Store revoked tokens in database or Redis
3. **Rate Limiting** - Implement rate limiting on login endpoint
4. **IP Whitelisting** - For sensitive operations
5. **Two-Factor Authentication** - Add 2FA for additional security
6. **Audit Logging** - Log all authentication attempts

## Testing

### Test Authentication Flow

1. Start the server:
```bash
cd server
npm start
```

2. Test login endpoint:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

3. Test protected endpoint without token:
```bash
curl http://localhost:5000/api/staff
# Should return 401 Unauthorized
```

4. Test protected endpoint with token:
```bash
curl http://localhost:5000/api/staff \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
# Should return staff data
```

## Troubleshooting

### Issue: "Access token required"

**Cause:** No token provided in request  
**Solution:** Include Authorization header with Bearer token

### Issue: "Token expired"

**Cause:** Token is older than 24 hours  
**Solution:** Re-authenticate to get a new token

### Issue: "Invalid token"

**Cause:** Token is malformed or signed with different secret  
**Solution:** 
- Ensure JWT_SECRET is the same on all server instances
- Re-authenticate to get a valid token
- Check that token hasn't been manually modified

### Issue: Server warning about JWT_SECRET

**Cause:** Using default or weak JWT_SECRET  
**Solution:** Generate and set a strong JWT_SECRET in .env file

## Migration Notes

### Breaking Changes

⚠️ **All API endpoints now require authentication** (except login, health, test, debug)

If you have existing clients:
1. Implement login flow to obtain JWT token
2. Update all API calls to include Authorization header
3. Handle 401 responses by redirecting to login

### Backward Compatibility

To temporarily disable authentication for specific routes (not recommended):

```javascript
// In route file, don't apply the middleware to specific routes
router.get('/public-endpoint', controller.getPublicData); // No middleware
router.get('/protected-endpoint', authenticateToken, controller.getProtectedData);
```

## Support

For questions or issues:
1. Check this documentation
2. Review middleware code in `server/middleware/auth.js`
3. Check server logs for detailed error messages
4. Ensure .env file is properly configured

## Version History

- **v1.0.0** (Current) - Initial JWT authentication implementation
  - Centralized authentication middleware
  - Protected all API routes
  - Token expiration (24 hours)
  - Role-based authorization support
  - Comprehensive error handling

