const db = require('./database/db');

async function setupMyDepartments() {
  try {
    console.log('Creating my_departments table...');
    
    // Create my_departments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS my_departments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting sample departments...');
    
    // Insert sample departments
    await db.query(`
      INSERT INTO my_departments (name, description) VALUES
      ('Human Resources', 'Human resources and personnel management'),
      ('Finance', 'Financial management and accounting'),
      ('Information Technology', 'IT services and technical support'),
      ('Operations', 'Business operations and logistics'),
      ('Sales', 'Sales and customer relations'),
      ('Marketing', 'Marketing and communications'),
      ('Customer Service', 'Customer support and service'),
      ('Administration', 'Administrative services'),
      ('Legal', 'Legal affairs and compliance'),
      ('Research & Development', 'Research and product development')
      ON DUPLICATE KEY UPDATE name=name
    `);

    console.log('Adding department_id column to staff table...');
    
    // Add department_id column to staff table
    try {
      await db.query('ALTER TABLE staff ADD COLUMN department_id INT NULL AFTER department');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('department_id column already exists');
      } else {
        throw error;
      }
    }

    console.log('Adding foreign key constraint...');
    
    // Add foreign key constraint
    try {
      await db.query(`
        ALTER TABLE staff ADD CONSTRAINT fk_staff_department 
        FOREIGN KEY (department_id) REFERENCES my_departments(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('Foreign key constraint already exists');
      } else {
        throw error;
      }
    }

    console.log('Migrating existing department data...');
    
    // Migrate existing department data to use foreign keys
    await db.query(`
      UPDATE staff s 
      JOIN my_departments md ON s.department = md.name 
      SET s.department_id = md.id 
      WHERE s.department IS NOT NULL AND s.department != ''
    `);

    console.log('✅ my_departments table setup completed successfully!');
    
    // Show the results
    const [departments] = await db.query('SELECT * FROM my_departments ORDER BY name');
    console.log('Available departments:');
    departments.forEach(dept => {
      console.log(`- ${dept.id}: ${dept.name} (${dept.description})`);
    });

    const [staffWithDepts] = await db.query(`
      SELECT s.id, s.name, s.department, s.department_id, md.name as dept_name 
      FROM staff s 
      LEFT JOIN my_departments md ON s.department_id = md.id 
      WHERE s.department_id IS NOT NULL
    `);
    console.log(`\nStaff with departments assigned: ${staffWithDepts.length}`);
    
  } catch (error) {
    console.error('❌ Error setting up my_departments:', error);
  } finally {
    process.exit(0);
  }
}

setupMyDepartments();
