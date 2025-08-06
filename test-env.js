const path = require('path');
const fs = require('fs');

console.log('Current directory:', process.cwd());
console.log('.env file exists:', fs.existsSync('.env'));

if (fs.existsSync('.env')) {
  console.log('.env file content:');
  console.log(fs.readFileSync('.env', 'utf8'));
}

console.log('\n--- Loading dotenv ---');
require('dotenv').config();

console.log('\nEnvironment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT); 