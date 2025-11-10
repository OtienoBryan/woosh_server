const db = require('./database/db');

/**
 * Diagnostic script to check product categories in availability reports
 * Helps identify mismatches between ProductReport and products table
 */
async function checkProductCategories() {
  try {
    console.log('=== PRODUCT CATEGORY DIAGNOSTIC ===\n');
    
    // Check products with "Caramel Hazelnut" in the name
    console.log('1. Products with "Caramel Hazelnut" in name:');
    const [products] = await db.query(`
      SELECT p.id, p.product_name, p.category_id, c.name AS category_name, c.orderIndex
      FROM products p
      LEFT JOIN Category c ON p.category_id = c.id
      WHERE p.product_name LIKE '%Caramel Hazelnut%'
      ORDER BY p.product_name
    `);
    console.table(products);
    console.log('');
    
    // Check ProductReport entries for "Caramel Hazelnut"
    console.log('2. ProductReport entries with "Caramel Hazelnut" in name:');
    const [reports] = await db.query(`
      SELECT ar.id, ar.productId, ar.ProductName, 
             p.product_name AS matched_product_name, 
             p.category_id AS matched_category_id,
             c.name AS matched_category_name,
             ar.createdAt
      FROM ProductReport ar
      LEFT JOIN products p ON ar.productId = p.id
      LEFT JOIN Category c ON p.category_id = c.id
      WHERE ar.ProductName LIKE '%Caramel Hazelnut%'
      ORDER BY ar.createdAt DESC
      LIMIT 20
    `);
    console.table(reports);
    console.log('');
    
    // Check for mismatches
    console.log('3. Potential mismatches (ProductReport.productId does not match ProductName):');
    const [mismatches] = await db.query(`
      SELECT ar.id, ar.productId, ar.ProductName,
             p.product_name AS matched_product_name,
             p.category_id,
             c.name AS category_name,
             CASE 
               WHEN TRIM(ar.ProductName) = TRIM(p.product_name) THEN 'MATCH'
               ELSE 'MISMATCH'
             END AS name_match_status
      FROM ProductReport ar
      LEFT JOIN products p ON ar.productId = p.id
      LEFT JOIN Category c ON p.category_id = c.id
      WHERE ar.ProductName LIKE '%Caramel Hazelnut%'
        AND (TRIM(ar.ProductName) != TRIM(p.product_name) OR p.product_name IS NULL)
      ORDER BY ar.createdAt DESC
      LIMIT 20
    `);
    console.table(mismatches);
    console.log('');
    
    // Check all categories
    console.log('4. All categories in database:');
    const [categories] = await db.query(`
      SELECT id, name, orderIndex, 
             (SELECT COUNT(*) FROM products WHERE category_id = Category.id) AS product_count
      FROM Category
      ORDER BY orderIndex, name
    `);
    console.table(categories);
    console.log('');
    
    // Check products by category
    console.log('5. Sample products by category (3000 puffs vs 9000 puffs):');
    const [byCategory] = await db.query(`
      SELECT c.name AS category, 
             p.id, 
             p.product_name,
             COUNT(ar.id) AS report_count
      FROM Category c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN ProductReport ar ON p.id = ar.productId
      WHERE c.name IN ('3000 puffs', '9000 puffs', '3000puffs', '9000puffs')
      GROUP BY c.id, c.name, p.id, p.product_name
      ORDER BY c.name, p.product_name
      LIMIT 30
    `);
    console.table(byCategory);
    
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProductCategories();
