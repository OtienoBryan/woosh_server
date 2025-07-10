const db = require('../config/database');

async function seedData() {
  try {
    console.log('🌱 Seeding database with sample data...\n');

    // Insert sample suppliers
    console.log('📦 Adding sample suppliers...');
    const suppliers = [
      {
        supplier_code: 'SUP001',
        company_name: 'ABC Electronics',
        contact_person: 'John Smith',
        email: 'john@abcelectronics.com',
        phone: '+1-555-0101',
        address: '123 Tech Street, Silicon Valley, CA 94025',
        tax_id: 'TAX123456',
        payment_terms: 30,
        credit_limit: 50000
      },
      {
        supplier_code: 'SUP002',
        company_name: 'XYZ Manufacturing',
        contact_person: 'Sarah Johnson',
        email: 'sarah@xyzmanufacturing.com',
        phone: '+1-555-0102',
        address: '456 Industrial Blvd, Detroit, MI 48201',
        tax_id: 'TAX789012',
        payment_terms: 45,
        credit_limit: 75000
      },
      {
        supplier_code: 'SUP003',
        company_name: 'Global Parts Co.',
        contact_person: 'Mike Chen',
        email: 'mike@globalparts.com',
        phone: '+1-555-0103',
        address: '789 Parts Avenue, Chicago, IL 60601',
        tax_id: 'TAX345678',
        payment_terms: 30,
        credit_limit: 100000
      },
      {
        supplier_code: 'SUP004',
        company_name: 'Quality Supplies Ltd.',
        contact_person: 'Lisa Brown',
        email: 'lisa@qualitysupplies.com',
        phone: '+1-555-0104',
        address: '321 Quality Road, Boston, MA 02101',
        tax_id: 'TAX901234',
        payment_terms: 60,
        credit_limit: 25000
      },
      {
        supplier_code: 'SUP005',
        company_name: 'Premium Components',
        contact_person: 'David Wilson',
        email: 'david@premiumcomponents.com',
        phone: '+1-555-0105',
        address: '654 Premium Lane, Austin, TX 73301',
        tax_id: 'TAX567890',
        payment_terms: 30,
        credit_limit: 150000
      }
    ];

    for (const supplier of suppliers) {
      await db.query(`
        INSERT INTO suppliers (supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [supplier.supplier_code, supplier.company_name, supplier.contact_person, supplier.email, supplier.phone, supplier.address, supplier.tax_id, supplier.payment_terms, supplier.credit_limit]);
    }
    console.log('✅ Added 5 suppliers');

    // Insert sample products
    console.log('\n📦 Adding sample products...');
    const products = [
      {
        product_code: 'PROD001',
        product_name: 'Laptop Computer',
        description: 'High-performance laptop with 16GB RAM and 512GB SSD',
        category: 'Electronics',
        unit_of_measure: 'PCS',
        cost_price: 800.00,
        selling_price: 1200.00,
        reorder_level: 10,
        current_stock: 25
      },
      {
        product_code: 'PROD002',
        product_name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        category: 'Electronics',
        unit_of_measure: 'PCS',
        cost_price: 15.00,
        selling_price: 25.00,
        reorder_level: 50,
        current_stock: 100
      },
      {
        product_code: 'PROD003',
        product_name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with Cherry MX switches',
        category: 'Electronics',
        unit_of_measure: 'PCS',
        cost_price: 60.00,
        selling_price: 95.00,
        reorder_level: 20,
        current_stock: 35
      },
      {
        product_code: 'PROD004',
        product_name: 'USB-C Cable',
        description: 'High-speed USB-C cable for data transfer and charging',
        category: 'Accessories',
        unit_of_measure: 'PCS',
        cost_price: 5.00,
        selling_price: 12.00,
        reorder_level: 100,
        current_stock: 200
      },
      {
        product_code: 'PROD005',
        product_name: 'Monitor Stand',
        description: 'Adjustable monitor stand for ergonomic positioning',
        category: 'Accessories',
        unit_of_measure: 'PCS',
        cost_price: 25.00,
        selling_price: 45.00,
        reorder_level: 15,
        current_stock: 30
      },
      {
        product_code: 'PROD006',
        product_name: 'Webcam HD',
        description: '1080p HD webcam with built-in microphone',
        category: 'Electronics',
        unit_of_measure: 'PCS',
        cost_price: 35.00,
        selling_price: 65.00,
        reorder_level: 25,
        current_stock: 40
      },
      {
        product_code: 'PROD007',
        product_name: 'Bluetooth Speaker',
        description: 'Portable Bluetooth speaker with 20W output',
        category: 'Electronics',
        unit_of_measure: 'PCS',
        cost_price: 45.00,
        selling_price: 85.00,
        reorder_level: 30,
        current_stock: 50
      },
      {
        product_code: 'PROD008',
        product_name: 'Laptop Charger',
        description: 'Universal laptop charger with multiple adapters',
        category: 'Accessories',
        unit_of_measure: 'PCS',
        cost_price: 20.00,
        selling_price: 35.00,
        reorder_level: 40,
        current_stock: 75
      },
      {
        product_code: 'PROD009',
        product_name: 'Gaming Headset',
        description: '7.1 surround sound gaming headset with microphone',
        category: 'Electronics',
        unit_of_measure: 'PCS',
        cost_price: 55.00,
        selling_price: 99.00,
        reorder_level: 20,
        current_stock: 30
      },
      {
        product_code: 'PROD010',
        product_name: 'Desk Lamp',
        description: 'LED desk lamp with adjustable brightness and color temperature',
        category: 'Accessories',
        unit_of_measure: 'PCS',
        cost_price: 30.00,
        selling_price: 55.00,
        reorder_level: 25,
        current_stock: 45
      }
    ];

    for (const product of products) {
      await db.query(`
        INSERT INTO products (product_code, product_name, description, category, unit_of_measure, cost_price, selling_price, reorder_level, current_stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [product.product_code, product.product_name, product.description, product.category, product.unit_of_measure, product.cost_price, product.selling_price, product.reorder_level, product.current_stock]);
    }
    console.log('✅ Added 10 products');

    // Insert sample customers
    console.log('\n👥 Adding sample customers...');
    const customers = [
      {
        customer_code: 'CUST001',
        company_name: 'Tech Solutions Inc.',
        contact_person: 'Alice Johnson',
        email: 'alice@techsolutions.com',
        phone: '+1-555-0201',
        address: '100 Tech Plaza, San Francisco, CA 94105',
        tax_id: 'CUST123456',
        payment_terms: 30,
        credit_limit: 100000
      },
      {
        customer_code: 'CUST002',
        company_name: 'Digital Innovations',
        contact_person: 'Bob Davis',
        email: 'bob@digitalinnovations.com',
        phone: '+1-555-0202',
        address: '200 Innovation Drive, Seattle, WA 98101',
        tax_id: 'CUST789012',
        payment_terms: 45,
        credit_limit: 75000
      },
      {
        customer_code: 'CUST003',
        company_name: 'Smart Systems',
        contact_person: 'Carol White',
        email: 'carol@smartsystems.com',
        phone: '+1-555-0203',
        address: '300 Smart Street, New York, NY 10001',
        tax_id: 'CUST345678',
        payment_terms: 30,
        credit_limit: 150000
      }
    ];

    for (const customer of customers) {
      await db.query(`
        INSERT INTO customers (customer_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [customer.customer_code, customer.company_name, customer.contact_person, customer.email, customer.phone, customer.address, customer.tax_id, customer.payment_terms, customer.credit_limit]);
    }
    console.log('✅ Added 3 customers');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 5 suppliers added');
    console.log('   - 10 products added');
    console.log('   - 3 customers added');
    console.log('\n🚀 You can now test the purchase order functionality!');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

seedData(); 