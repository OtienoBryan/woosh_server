const https = require('https');

// Test the current CORS configuration
const testCORS = () => {
  const options = {
    hostname: 'woosh-server.vercel.app',
    port: 443,
    path: '/api/health',
    method: 'GET',
    headers: {
      'Origin': 'https://woosh-client.vercel.app',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.end();
};

// Test OPTIONS request (preflight)
const testPreflight = () => {
  const options = {
    hostname: 'woosh-server.vercel.app',
    port: 443,
    path: '/api/auth/login',
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://woosh-client.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  };

  const req = https.request(options, (res) => {
    console.log('\n=== PREFLIGHT TEST ===');
    console.log('Status:', res.statusCode);
    console.log('CORS Headers:');
    console.log('  Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
    console.log('  Access-Control-Allow-Headers:', res.headers['access-control-allow-headers']);
    console.log('  Access-Control-Allow-Credentials:', res.headers['access-control-allow-credentials']);
  });

  req.on('error', (e) => {
    console.error('Preflight Error:', e);
  });

  req.end();
};

console.log('Testing CORS configuration...');
testCORS();
setTimeout(testPreflight, 1000); 