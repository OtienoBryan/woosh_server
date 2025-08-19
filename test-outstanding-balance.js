const axios = require('axios');

async function testOutstandingBalanceAPI() {
  try {
    console.log('=== TESTING OUTSTANDING BALANCE API ===\n');
    
    const API_BASE_URL = 'http://localhost:5000/api';
    
    // Test with a sample client ID (you may need to adjust this)
    const clientId = 1; // Change this to an actual client ID in your database
    console.log(`Testing with client ID: ${clientId}`);
    
    const response = await axios.get(`${API_BASE_URL}/financial/clients/${clientId}/outstanding-balance`);
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ API Response Success');
      console.log(`Client ID: ${data.client_id}`);
      console.log(`Outstanding Balance: ${data.outstanding_balance}`);
    } else {
      console.log('❌ API Response Failed');
      console.log('Error:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ API Call Failed');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the test
testOutstandingBalanceAPI();
