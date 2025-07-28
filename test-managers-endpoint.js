const axios = require('axios');

async function testManagersEndpoint() {
  try {
    console.log('Testing managers endpoint...');
    
    // Test the managers endpoint
    const response = await axios.get('http://localhost:3000/api/managers');
    console.log('Managers endpoint response:', response.status);
    console.log('Managers data:', response.data);
    
    // Test the managers performance endpoint
    const perfResponse = await axios.get('http://localhost:3000/api/managers/performance');
    console.log('Managers performance endpoint response:', perfResponse.status);
    console.log('Performance data:', perfResponse.data);
    
  } catch (error) {
    console.error('Error testing managers endpoint:', error.response?.status, error.response?.data);
  }
}

testManagersEndpoint(); 