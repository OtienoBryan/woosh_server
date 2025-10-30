const db = require('./database/db');

/**
 * Migration script to link existing products to categories
 * This will map products.category (string) to Category.id using category_id
 */
async function migrateProductCategories() {
  try {
    console.log('🚀 Starting product category migration...');
    
    // Step 1: Get all products without category_id
    console.log('\n📊 Checking products without category assignment...');
    const [unassignedProducts] = await db.query(`
      SELECT id, product_name, category 
      FROM products 
      WHERE category_id IS NULL
      LIMIT 100
    `);
    
    console.log(`Found ${unassignedProducts.length} products without category_id`);
    
    if (unassignedProducts.length === 0) {
      console.log('✅ All products already have category assignments!');
      process.exit(0);
    }
    
    // Step 2: Get all available categories
    const [categories] = await db.query('SELECT id, name FROM Category ORDER BY name');
    console.log(`\n📋 Available Categories (${categories.length}):`);
    console.table(categories);
    
    // Step 3: Create category name mapping (case-insensitive)
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    });
    
    // Step 4: Update products based on their string category
    let updated = 0;
    let notFound = 0;
    
    console.log('\n🔄 Updating products...');
    
    for (const product of unassignedProducts) {
      if (!product.category || product.category.trim() === '') {
        // Assign to "Other" category if no category specified
        const otherCategoryId = categoryMap.get('other');
        if (otherCategoryId) {
          await db.query(
            'UPDATE products SET category_id = ? WHERE id = ?',
            [otherCategoryId, product.id]
          );
          updated++;
        }
        continue;
      }
      
      // Try to find matching category
      const categoryKey = product.category.toLowerCase().trim();
      let categoryId = categoryMap.get(categoryKey);
      
      // If exact match not found, try partial match
      if (!categoryId) {
        for (const [catName, catId] of categoryMap.entries()) {
          if (catName.includes(categoryKey) || categoryKey.includes(catName)) {
            categoryId = catId;
            break;
          }
        }
      }
      
      if (categoryId) {
        await db.query(
          'UPDATE products SET category_id = ? WHERE id = ?',
          [categoryId, product.id]
        );
        console.log(`✅ ${product.product_name}: "${product.category}" → Category ID ${categoryId}`);
        updated++;
      } else {
        console.log(`⚠️  ${product.product_name}: Category "${product.category}" not found, assigning to "Other"`);
        const otherCategoryId = categoryMap.get('other');
        if (otherCategoryId) {
          await db.query(
            'UPDATE products SET category_id = ? WHERE id = ?',
            [otherCategoryId, product.id]
          );
          updated++;
        }
        notFound++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Products updated: ${updated}`);
    console.log(`⚠️  Categories not found: ${notFound}`);
    
    // Step 5: Verify migration
    const [stillUnassigned] = await db.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE category_id IS NULL
    `);
    
    console.log(`\n📊 Products still without category: ${stillUnassigned[0].count}`);
    
    // Step 6: Show category distribution
    const [distribution] = await db.query(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as product_count
      FROM Category c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY c.orderIndex, c.name
    `);
    
    console.log('\n📊 Product Distribution by Category:');
    console.table(distribution);
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

migrateProductCategories();

