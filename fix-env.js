const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing .env file configuration...\n');

const envPath = path.join(__dirname, '.env');

// Read existing .env file
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('✅ Found existing .env file');
} else {
  console.log('⚠️  No .env file found, creating new one...');
}

// Check what's missing
const missingVars = [];
const requiredVars = [
  'DB_HOST',
  'DB_USER', 
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

console.log('📋 Current .env content:');
console.log(envContent);

console.log('\n🔍 Checking for missing variables...');

requiredVars.forEach(varName => {
  if (!envContent.includes(`${varName}=`)) {
    missingVars.push(varName);
    console.log(`❌ Missing: ${varName}`);
  } else {
    console.log(`✅ Found: ${varName}`);
  }
});

if (missingVars.length === 0) {
  console.log('\n✅ All required variables are present!');
} else {
  console.log('\n📝 Please add the following missing variables to your .env file:');
  
  missingVars.forEach(varName => {
    switch(varName) {
      case 'DB_USER':
        console.log('DB_USER=root');
        break;
      case 'DB_PASSWORD':
        console.log('DB_PASSWORD=');
        break;
      case 'DB_NAME':
        console.log('DB_NAME=retail_finance');
        break;
      case 'JWT_SECRET':
        console.log('JWT_SECRET=your-super-secret-jwt-key-change-this-in-production');
        break;
      case 'PORT':
        console.log('PORT=5000');
        break;
      case 'NODE_ENV':
        console.log('NODE_ENV=development');
        break;
      case 'CLOUDINARY_CLOUD_NAME':
        console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
        break;
      case 'CLOUDINARY_API_KEY':
        console.log('CLOUDINARY_API_KEY=your_api_key');
        break;
      case 'CLOUDINARY_API_SECRET':
        console.log('CLOUDINARY_API_SECRET=your_api_secret');
        break;
    }
  });
  
  console.log('\n🔗 To get your Cloudinary credentials:');
  console.log('1. Go to https://cloudinary.com/');
  console.log('2. Sign up or log in to your account');
  console.log('3. Go to Dashboard');
  console.log('4. Copy your Cloud Name, API Key, and API Secret');
  console.log('5. Replace the placeholder values above');
}

console.log('\n✅ After updating the .env file, restart your server!'); 