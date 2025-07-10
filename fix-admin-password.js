const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...\n');

    // Hash the password "admin123"
    const password = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('📝 Updating admin password...');
    
    // Update the admin user's password
    const [result] = await db.query(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );

    if (result.affectedRows > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('🔑 New credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
  } finally {
    process.exit(0);
  }
}

fixAdminPassword(); 