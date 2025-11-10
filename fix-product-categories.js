const db = require('./database/db');

/**
 * Script to fix product categories
 * Updates products with "9000 puffs" in name to have category "9000 puffs"
 * Updates products with "3000 puffs" in name to have category "3000 puffs"
 */
async function fixProductCategories() {
  try {
    console.log('=== FIXING PRODUCT CATEGORIES ===\n');
    
    // Get category IDs
    const [categories] = await db.query(`
      SELECT id, name FROM Category WHERE name IN ('3000 puffs', '9000 puffs')
    `);
    
    const category3000 = categories.find(c => c.name === '3000 puffs');
    const category9000 = categories.find(c => c.name === '9000 puffs');
    
    if (!category3000 || !category9000) {
      console.error('Categories not found!');
      process.exit(1);
    }
    
    console.log(`Found categories: 3000 puffs (ID: ${category3000.id}), 9000 puffs (ID: ${category9000.id})\n`);
    
    // Fix products with "9000 puffs" in name
    console.log('1. Fixing products with "9000 puffs" in name:');
    const [update9000] = await db.query(`
      UPDATE products 
      SET category_id = ?
      WHERE product_name LIKE '%9000 puffs%' 
        AND category_id != ?
    `, [category9000.id, category9000.id]);
    console.log(`   Updated ${update9000.affectedRows} products to category "9000 puffs"`);
    
    // Fix products with "3000 puffs" in name (but not "9000 puffs")
    console.log('\n2. Fixing products with "3000 puffs" in name (but not "9000 puffs"):');
    const [update3000] = await db.query(`
      UPDATE products 
      SET category_id = ?
      WHERE product_name LIKE '%3000 puffs%' 
        AND product_name NOT LIKE '%9000 puffs%'
        AND category_id != ?
    `, [category3000.id, category3000.id]);
    console.log(`   Updated ${update3000.affectedRows} products to category "3000 puffs"`);
    
    // Also fix products with "9000puffs" (no space) in name
    console.log('\n3. Fixing products with "9000puffs" (no space) in name:');
    const [update9000NoSpace] = await db.query(`
      UPDATE products 
      SET category_id = ?
      WHERE product_name LIKE '%9000puffs%' 
        AND category_id != ?
    `, [category9000.id, category9000.id]);
    console.log(`   Updated ${update9000NoSpace.affectedRows} products to category "9000 puffs"`);
    
    // Also fix products with "3000puffs" (no space) in name (but not "9000puffs")
    console.log('\n4. Fixing products with "3000puffs" (no space) in name:');
    const [update3000NoSpace] = await db.query(`
      UPDATE products 
      SET category_id = ?
      WHERE product_name LIKE '%3000puffs%' 
        AND product_name NOT LIKE '%9000puffs%'
        AND category_id != ?
    `, [category3000.id, category3000.id]);
    console.log(`   Updated ${update3000NoSpace.affectedRows} products to category "3000 puffs"`);
    
    // Verify the fixes
    console.log('\n5. Verifying fixes:');
    const [verify] = await db.query(`
      SELECT p.id, p.product_name, p.category_id, c.name AS category_name
      FROM products p
      LEFT JOIN Category c ON p.category_id = c.id
      WHERE p.product_name LIKE '%Caramel Hazelnut%'
         OR p.product_name LIKE '%9000 puffs%'
         OR p.product_name LIKE '%9000puffs%'
      ORDER BY p.product_name
    `);
    console.table(verify);
    
    console.log('\n=== FIX COMPLETE ===');
    console.log('\nNext steps:');
    console.log('1. Restart your server to see the changes');
    console.log('2. Refresh the availability reports page');
    console.log('3. Products should now show the correct categories');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProductCategories();
