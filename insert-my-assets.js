const connection = require('./database/db');

async function insertMyAssets() {
  try {
    console.log('Inserting data into my_assets table...\n');
    
    // Sample assets data
    const assets = [
      {
        asset_code: 'AST001',
        asset_name: 'Dell Laptop XPS 13',
        asset_type: 'Computer Equipment',
        purchase_date: '2024-01-15',
        location: 'IT Department',
        supplier_id: 1,
        price: 1200.00,
        quantity: 1
      },
      {
        asset_code: 'AST002',
        asset_name: 'Office Desk',
        asset_type: 'Furniture',
        purchase_date: '2024-02-01',
        location: 'Marketing Department',
        supplier_id: 2,
        price: 500.00,
        quantity: 1
      },
      {
        asset_code: 'AST003',
        asset_name: 'Printer HP LaserJet',
        asset_type: 'Office Equipment',
        purchase_date: '2024-01-20',
        location: 'Admin Office',
        supplier_id: 3,
        price: 800.00,
        quantity: 1
      },
      {
        asset_code: 'AST004',
        asset_name: 'Office Chairs',
        asset_type: 'Furniture',
        purchase_date: '2024-02-10',
        location: 'Sales Department',
        supplier_id: 2,
        price: 300.00,
        quantity: 5
      },
      {
        asset_code: 'AST005',
        asset_name: 'Network Switch',
        asset_type: 'IT Equipment',
        purchase_date: '2024-01-25',
        location: 'Server Room',
        supplier_id: 1,
        price: 1500.00,
        quantity: 1
      },
      {
        asset_code: 'AST006',
        asset_name: 'Projector Epson',
        asset_type: 'Presentation Equipment',
        purchase_date: '2024-02-15',
        location: 'Conference Room',
        supplier_id: 3,
        price: 2500.00,
        quantity: 1
      },
      {
        asset_code: 'AST007',
        asset_name: 'Filing Cabinets',
        asset_type: 'Furniture',
        purchase_date: '2024-01-30',
        location: 'HR Department',
        supplier_id: 2,
        price: 400.00,
        quantity: 3
      },
      {
        asset_code: 'AST008',
        asset_name: 'Security Cameras',
        asset_type: 'Security Equipment',
        purchase_date: '2024-02-05',
        location: 'Building Perimeter',
        supplier_id: 4,
        price: 1800.00,
        quantity: 4
      },
      {
        asset_code: 'AST009',
        asset_name: 'Air Conditioners',
        asset_type: 'HVAC Equipment',
        purchase_date: '2024-01-10',
        location: 'Office Floors',
        supplier_id: 4,
        price: 3500.00,
        quantity: 2
      },
      {
        asset_code: 'AST010',
        asset_name: 'Coffee Machine',
        asset_type: 'Kitchen Equipment',
        purchase_date: '2024-02-20',
        location: 'Break Room',
        supplier_id: 3,
        price: 1200.00,
        quantity: 1
      }
    ];

    // Check if table exists
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'my_assets'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Table "my_assets" does not exist. Please run the setup script first.');
      return;
    }

    // Check if suppliers exist
    const [suppliers] = await connection.query('SELECT id, company_name FROM suppliers LIMIT 5');
    console.log('Available suppliers:');
    suppliers.forEach(supplier => {
      console.log(`- ID ${supplier.id}: ${supplier.company_name}`);
    });
    console.log('');

    // Insert assets
    for (const asset of assets) {
      try {
        await connection.query(`
          INSERT INTO my_assets (asset_code, asset_name, asset_type, purchase_date, location, supplier_id, price, quantity)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          asset.asset_code,
          asset.asset_name,
          asset.asset_type,
          asset.purchase_date,
          asset.location,
          asset.supplier_id,
          asset.price,
          asset.quantity
        ]);
        
        console.log(`✅ Inserted: ${asset.asset_code} - ${asset.asset_name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Skipped: ${asset.asset_code} (already exists)`);
        } else {
          console.log(`❌ Error inserting ${asset.asset_code}:`, error.message);
        }
      }
    }

    // Show inserted data
    console.log('\n📊 Current assets in database:');
    console.log('==============================');
    
    const [insertedAssets] = await connection.query(`
      SELECT ma.*, s.company_name as supplier_name 
      FROM my_assets ma 
      LEFT JOIN suppliers s ON ma.supplier_id = s.id 
      ORDER BY ma.asset_code
    `);
    
    insertedAssets.forEach(asset => {
      const totalValue = asset.price * asset.quantity;
      console.log(`- ${asset.asset_code}: ${asset.asset_name} (${asset.asset_type})`);
      console.log(`  Location: ${asset.location} | Supplier: ${asset.supplier_name}`);
      console.log(`  Price: KES ${asset.price.toLocaleString()} x ${asset.quantity} = KES ${totalValue.toLocaleString()}`);
      console.log(`  Purchase Date: ${asset.purchase_date}`);
      console.log('');
    });

    // Summary statistics
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_assets,
        SUM(quantity) as total_quantity,
        SUM(price * quantity) as total_value,
        COUNT(DISTINCT asset_type) as asset_types,
        COUNT(DISTINCT location) as locations
      FROM my_assets
    `);
    
    const summary = stats[0];
    console.log('📈 Summary Statistics:');
    console.log('======================');
    console.log(`Total Assets: ${summary.total_assets}`);
    console.log(`Total Quantity: ${summary.total_quantity}`);
    console.log(`Total Value: KES ${summary.total_value.toLocaleString()}`);
    console.log(`Asset Types: ${summary.asset_types}`);
    console.log(`Locations: ${summary.locations}`);

  } catch (error) {
    console.error('❌ Error inserting assets:', error);
  } finally {
    process.exit(0);
  }
}

insertMyAssets(); 