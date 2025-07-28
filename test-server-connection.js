const axios = require('axios');

async function testServerConnection() {
  try {
    console.log('Testing server connection...');
    
    // Test basic server connection
    const testResponse = await axios.get('http://localhost:5000/api/test');
    console.log('Server is running:', testResponse.status);
    console.log('Test response:', testResponse.data);
    
    // Test managers endpoint
    try {
      const managersResponse = await axios.get('http://localhost:5000/api/managers');
      console.log('Managers endpoint working:', managersResponse.status);
      console.log('Managers data:', managersResponse.data);
    } catch (error) {
      console.log('Managers endpoint error:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('Server connection failed:', error.message);
    console.log('Make sure the server is running on port 5000');
  }
}

testServerConnection(); 