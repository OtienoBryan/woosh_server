# Woosh Finance Backend - Serverless Deployment

This is the backend server for the Woosh Finance Management System, configured for deployment on Vercel's serverless platform.

## Architecture

The application is structured for serverless deployment with the following key components:

- **`api/index.js`**: Main serverless function entry point
- **`routes/`**: Express route handlers organized by feature
- **`controllers/`**: Business logic handlers
- **`database/`**: Database configuration and schemas
- **`config/`**: Configuration files (Cloudinary, etc.)

## Serverless Configuration

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/uploads/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Key Features

### API Endpoints

The application provides RESTful APIs for:

- **Authentication**: `/api/auth/login`
- **Staff Management**: `/api/staff/*`
- **Financial Management**: `/api/financial/*`
- **Client Management**: `/api/clients/*`
- **Sales Management**: `/api/sales/*`
- **Payroll Management**: `/api/payroll/*`
- **Reports**: Various reporting endpoints
- **File Uploads**: `/api/upload/*`

### Database

- Uses MySQL database
- Connection configured in `database/db.js`
- Supports complex financial transactions and reporting

### File Uploads

- Cloudinary integration for cloud storage
- Multer middleware for file handling
- Static file serving for uploads

## Environment Variables

Required environment variables for deployment:

```env
# Database
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name

# JWT
JWT_SECRET=your-jwt-secret

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Run development server
npm run dev
```

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set Environment Variables**:
   ```bash
   vercel env add DB_HOST
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_NAME
   vercel env add JWT_SECRET
   vercel env add FRONTEND_URL
   vercel env add CLOUDINARY_CLOUD_NAME
   vercel env add CLOUDINARY_API_KEY
   vercel env add CLOUDINARY_API_SECRET
   ```

## Limitations

### Serverless Constraints

1. **Socket.IO**: Real-time WebSocket connections are not supported in serverless environments. Consider using:
   - Pusher
   - Socket.io Cloud
   - Firebase Realtime Database
   - AWS AppSync

2. **File System**: No persistent file system. All file operations should use cloud storage (Cloudinary).

3. **State**: No in-memory state persistence between function invocations.

4. **Cold Starts**: Functions may experience cold start delays.

## API Documentation

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password"
}
```

### Staff Management

```http
GET /api/staff
Authorization: Bearer <token>

POST /api/staff
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "manager"
}
```

### Financial Reports

```http
GET /api/financial/balance-sheet
Authorization: Bearer <token>

GET /api/financial/profit-loss
Authorization: Bearer <token>
```

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure database is accessible from Vercel's servers
2. **Environment Variables**: Verify all required env vars are set in Vercel dashboard
3. **CORS**: Check FRONTEND_URL is correctly configured
4. **File Uploads**: Ensure Cloudinary credentials are valid

### Logs

View function logs in Vercel dashboard or via CLI:
```bash
vercel logs
```

## Development vs Production

- **Development**: Uses `server.js` with full Socket.IO support
- **Production**: Uses `api/index.js` optimized for serverless deployment

## Security Considerations

1. **JWT Tokens**: Secure token storage and validation
2. **Database**: Use connection pooling and prepared statements
3. **File Uploads**: Validate file types and sizes
4. **CORS**: Restrict origins to trusted domains
5. **Environment Variables**: Never commit secrets to version control 