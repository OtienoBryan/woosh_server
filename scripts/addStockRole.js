const db = require('../database/db');
const bcrypt = require('bcryptjs');

async function addStockRole() {
  try {
    console.log('Adding stock role to the system...');

    // First, let's check if the staff table exists and see its structure
    const [tables] = await db.query('SHOW TABLES LIKE "staff"');
    if (tables.length === 0) {
      console.error('Staff table does not exist!');
      return;
    }

    // Check the current roles in the staff table
    const [existingRoles] = await db.query('SELECT DISTINCT role FROM staff');
    console.log('Existing roles:', existingRoles.map(r => r.role));

    // Add a test stock user
    const hashedPassword = await bcrypt.hash('stock123', 10);
    
    const [result] = await db.query(`
      INSERT INTO staff (
        name, 
        photo_url, 
        empl_no, 
        id_no, 
        role, 
        phone_number, 
        department, 
        business_email, 
        department_email, 
        salary, 
        employment_type,
        password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Stock Manager',
      'https://randomuser.me/api/portraits/men/10.jpg',
      'EMP005',
      '56789012',
      'stock',
      '+254700123456',
      'Inventory',
      'stock@company.com',
      'inventory@company.com',
      45000.00,
      'Consultant',
      hashedPassword
    ]);

    console.log('Stock user created successfully with ID:', result.insertId);
    console.log('Username: Stock Manager');
    console.log('Password: stock123');
    console.log('Role: stock');

    // Also add the role to the roles table if it exists
    try {
      const [rolesTable] = await db.query('SHOW TABLES LIKE "roles"');
      if (rolesTable.length > 0) {
        await db.query(`
          INSERT INTO roles (name, description) 
          VALUES (?, ?) 
          ON DUPLICATE KEY UPDATE description = ?
        `, ['stock', 'Inventory and stock management position', 'Inventory and stock management position']);
        console.log('Stock role added to roles table');
      }
    } catch (error) {
      console.log('Roles table does not exist or error adding role:', error.message);
    }

    console.log('Stock role setup completed successfully!');
  } catch (error) {
    console.error('Error adding stock role:', error);
  } finally {
    await db.end();
  }
}

addStockRole(); 