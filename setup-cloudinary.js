const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Cloudinary configuration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
  
  // Read existing .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if cloudinary variables are already set
  if (envContent.includes('CLOUDINARY_CLOUD_NAME')) {
    console.log('✅ Cloudinary variables are already configured');
    console.log('\n📋 Current Cloudinary configuration:');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      if (line.startsWith('CLOUDINARY_')) {
        console.log(`   ${line}`);
      }
    });
  } else {
    console.log('⚠️  Cloudinary variables are missing from .env file');
    console.log('\n📝 Please add the following lines to your .env file:');
    console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.log('CLOUDINARY_API_KEY=your_api_key');
    console.log('CLOUDINARY_API_SECRET=your_api_secret');
  }
} else {
  console.log('⚠️  .env file does not exist');
  console.log('\n📝 Please create a .env file in the server directory with the following content:');
  console.log(`
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=retail_finance

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=5000
NODE_ENV=development

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
  `);
}

console.log('\n🔗 To get your Cloudinary credentials:');
console.log('1. Go to https://cloudinary.com/');
console.log('2. Sign up or log in to your account');
console.log('3. Go to Dashboard');
console.log('4. Copy your Cloud Name, API Key, and API Secret');
console.log('5. Replace the placeholder values in your .env file');

console.log('\n✅ Once configured, restart your server and try uploading a document!'); 