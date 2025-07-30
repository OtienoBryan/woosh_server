const axios = require('axios');

async function testInventoryEndpoint() {
  try {
    console.log('🧪 Testing inventory endpoint...\n');
    
    // Test the stores endpoint first
    console.log('1. Testing /api/stores endpoint...');
    try {
      const storesResponse = await axios.get('http://localhost:5000/api/stores');
      console.log('✅ Stores endpoint response:', storesResponse.status);
      console.log('Stores data:', storesResponse.data);
      
      if (storesResponse.data.success && storesResponse.data.data.length > 0) {
        const firstStore = storesResponse.data.data[0];
        console.log(`\n2. Testing inventory for store ID: ${firstStore.id} (${firstStore.store_name})`);
        
        try {
          const inventoryResponse = await axios.get(`http://localhost:5000/api/stores/${firstStore.id}/inventory`);
          console.log('✅ Inventory endpoint response:', inventoryResponse.status);
          console.log('Inventory data:', inventoryResponse.data);
          
          if (inventoryResponse.data.success) {
            console.log(`\n📊 Found ${inventoryResponse.data.data.length} inventory items`);
            if (inventoryResponse.data.data.length > 0) {
              console.log('Sample inventory item:', inventoryResponse.data.data[0]);
            }
          } else {
            console.log('❌ Inventory endpoint returned error:', inventoryResponse.data);
          }
        } catch (inventoryError) {
          console.error('❌ Error calling inventory endpoint:', inventoryError.response?.data || inventoryError.message);
        }
      } else {
        console.log('❌ No stores found to test inventory');
      }
    } catch (storesError) {
      console.error('❌ Error calling stores endpoint:', storesError.response?.data || storesError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testInventoryEndpoint(); 