const db = require('./database/db');

async function debugClientIssue() {
  try {
    console.log('=== Debugging Client Issue ===');
    
    // Check if Clients table exists and has data
    try {
      const [clients] = await db.query('SELECT COUNT(*) as count FROM Clients');
      console.log(`Clients table has ${clients[0].count} records`);
      
      if (clients[0].count > 0) {
        const [sampleClients] = await db.query('SELECT id, name, client_type, route_id_update FROM Clients LIMIT 5');
        console.log('Sample clients:', sampleClients);
      }
    } catch (err) {
      console.log('Clients table error:', err.message);
    }
    
    // Check if sales_orders table has data
    try {
      const [salesOrders] = await db.query('SELECT COUNT(*) as count FROM sales_orders');
      console.log(`Sales orders table has ${salesOrders[0].count} records`);
      
      if (salesOrders[0].count > 0) {
        const [sampleOrders] = await db.query('SELECT id, client_id, order_date FROM sales_orders LIMIT 5');
        console.log('Sample sales orders:', sampleOrders);
      }
    } catch (err) {
      console.log('Sales orders table error:', err.message);
    }
    
    // Check if sales_order_items table has data
    try {
      const [salesItems] = await db.query('SELECT COUNT(*) as count FROM sales_order_items');
      console.log(`Sales order items table has ${salesItems[0].count} records`);
      
      if (salesItems[0].count > 0) {
        const [sampleItems] = await db.query('SELECT id, sales_order_id, product_id, quantity FROM sales_order_items LIMIT 5');
        console.log('Sample sales items:', sampleItems);
      }
    } catch (err) {
      console.log('Sales order items table error:', err.message);
    }
    
    // Check if products table has data
    try {
      const [products] = await db.query('SELECT COUNT(*) as count FROM products');
      console.log(`Products table has ${products[0].count} records`);
      
      if (products[0].count > 0) {
        const [sampleProducts] = await db.query('SELECT id, name, category_id FROM products LIMIT 5');
        console.log('Sample products:', sampleProducts);
      }
    } catch (err) {
      console.log('Products table error:', err.message);
    }
    
    // Check for orphaned sales orders (client_id that doesn't exist in Clients table)
    try {
      const [orphanedOrders] = await db.query(`
        SELECT so.id, so.client_id 
        FROM sales_orders so 
        LEFT JOIN Clients c ON so.client_id = c.id 
        WHERE c.id IS NULL
        LIMIT 10
      `);
      
      if (orphanedOrders.length > 0) {
        console.log('Found orphaned sales orders (client_id not in Clients table):', orphanedOrders);
      } else {
        console.log('No orphaned sales orders found');
      }
    } catch (err) {
      console.log('Orphaned orders check error:', err.message);
    }
    
    // Check for orphaned sales items (sales_order_id that doesn't exist in sales_orders table)
    try {
      const [orphanedItems] = await db.query(`
        SELECT soi.id, soi.sales_order_id 
        FROM sales_order_items soi 
        LEFT JOIN sales_orders so ON soi.sales_order_id = so.id 
        WHERE so.id IS NULL
        LIMIT 10
      `);
      
      if (orphanedItems.length > 0) {
        console.log('Found orphaned sales items (sales_order_id not in sales_orders table):', orphanedItems);
      } else {
        console.log('No orphaned sales items found');
      }
    } catch (err) {
      console.log('Orphaned items check error:', err.message);
    }
    
    // Test the sales performance query to see where it fails
    console.log('\n=== Testing Sales Performance Query ===');
    try {
      const [salesReps] = await db.query(`
        SELECT s.id, s.name, s.route_id_update, r.name AS route_name, s.region, rg.name AS region_name, s.country
        FROM SalesRep s
        LEFT JOIN routes r ON s.route_id_update = r.id
        LEFT JOIN regions rg ON s.region = rg.id OR s.region = rg.name
      `);
      console.log(`SalesReps found: ${salesReps.length}`);
      
      if (salesReps.length > 0) {
        console.log('Sample sales rep:', salesReps[0]);
      }
    } catch (err) {
      console.log('SalesRep query error:', err.message);
    }
    
    // Test the clients query
    try {
      const [clients] = await db.query('SELECT id, client_type, route_id_update FROM Clients');
      console.log(`Clients found: ${clients.length}`);
      
      if (clients.length > 0) {
        console.log('Sample client:', clients[0]);
      }
    } catch (err) {
      console.log('Clients query error:', err.message);
    }
    
    // Test the sales query
    try {
      const [sales] = await db.query(`
        SELECT soi.*, so.client_id, so.order_date, c.client_type, c.route_id_update, p.category_id
        FROM sales_order_items soi
        JOIN sales_orders so ON soi.sales_order_id = so.id
        JOIN Clients c ON so.client_id = c.id
        JOIN products p ON soi.product_id = p.id
        LIMIT 5
      `);
      console.log(`Sales records found: ${sales.length}`);
      
      if (sales.length > 0) {
        console.log('Sample sales record:', sales[0]);
      }
    } catch (err) {
      console.log('Sales query error:', err.message);
    }
    
  } catch (error) {
    console.error('Error debugging client issue:', error);
  } finally {
    process.exit(0);
  }
}

debugClientIssue(); 