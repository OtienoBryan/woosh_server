const db = require('./config/database');

async function createTestPurchaseOrder() {
  try {
    console.log('📋 Creating test purchase order...\n');

    // First, check if we have suppliers and products
    const [suppliers] = await db.query('SELECT id, company_name FROM suppliers WHERE is_active = true LIMIT 1');
    const [products] = await db.query('SELECT id, product_name, cost_price FROM products WHERE is_active = true LIMIT 2');

    if (suppliers.length === 0) {
      console.log('❌ No suppliers found. Please run the seed script first.');
      return;
    }

    if (products.length === 0) {
      console.log('❌ No products found. Please run the seed script first.');
      return;
    }

    const supplier = suppliers[0];
    const product1 = products[0];
    const product2 = products.length > 1 ? products[1] : products[0];

    // Create purchase order
    const [poResult] = await db.query(`
      INSERT INTO purchase_orders (
        po_number, supplier_id, order_date, expected_delivery_date, 
        status, subtotal, tax_amount, total_amount, notes, created_by
      ) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?, ?, ?, ?, ?)
    `, [
      'PO-TEST-001',
      supplier.id,
      'sent', // This status will show the Receive Items button
      1000.00,
      100.00,
      1100.00,
      'Test purchase order for receiving functionality',
      1
    ]);

    const poId = poResult.insertId;

    // Add purchase order items
    await db.query(`
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id, quantity, unit_price, total_price
      ) VALUES (?, ?, ?, ?, ?)
    `, [poId, product1.id, 10, product1.cost_price, 10 * product1.cost_price]);

    if (products.length > 1) {
      await db.query(`
        INSERT INTO purchase_order_items (
          purchase_order_id, product_id, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?)
      `, [poId, product2.id, 5, product2.cost_price, 5 * product2.cost_price]);
    }

    console.log('✅ Test purchase order created successfully!');
    console.log(`📄 PO Number: PO-TEST-001`);
    console.log(`🏢 Supplier: ${supplier.company_name}`);
    console.log(`📦 Items: ${products.length} products`);
    console.log(`📊 Status: sent (will show Receive Items button)`);
    console.log(`💰 Total: $1,100.00`);

  } catch (error) {
    console.error('❌ Error creating test purchase order:', error.message);
  } finally {
    process.exit(0);
  }
}

createTestPurchaseOrder(); 