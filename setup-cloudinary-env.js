const fs = require('fs');
const path = require('path');

console.log('=== Cloudinary Environment Setup ===\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('Please create a .env file in the server directory with the following variables:');
  console.log('');
  console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('CLOUDINARY_API_KEY=your_api_key');
  console.log('CLOUDINARY_API_SECRET=your_api_secret');
  console.log('');
  console.log('You can get these values from your Cloudinary dashboard:');
  console.log('https://cloudinary.com/console');
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let cloudName = null;
let apiKey = null;
let apiSecret = null;

lines.forEach(line => {
  if (line.startsWith('CLOUDINARY_CLOUD_NAME=')) {
    cloudName = line.split('=')[1]?.trim();
  } else if (line.startsWith('CLOUDINARY_API_KEY=')) {
    apiKey = line.split('=')[1]?.trim();
  } else if (line.startsWith('CLOUDINARY_API_SECRET=')) {
    apiSecret = line.split('=')[1]?.trim();
  }
});

console.log('Current Cloudinary configuration:');
console.log('CLOUDINARY_CLOUD_NAME:', cloudName ? '✅ SET' : '❌ NOT SET');
console.log('CLOUDINARY_API_KEY:', apiKey ? '✅ SET' : '❌ NOT SET');
console.log('CLOUDINARY_API_SECRET:', apiSecret ? '✅ SET' : '❌ NOT SET');

if (cloudName && apiKey && apiSecret) {
  console.log('\n✅ All Cloudinary environment variables are set!');
  console.log('Contract uploads will use Cloudinary.');
} else {
  console.log('\n⚠️  Some Cloudinary environment variables are missing.');
  console.log('Contract uploads will use local storage instead.');
  console.log('');
  console.log('To enable Cloudinary uploads, add these to your .env file:');
  console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('CLOUDINARY_API_KEY=your_api_key');
  console.log('CLOUDINARY_API_SECRET=your_api_secret');
}

console.log('\n=== Setup Complete ==='); 