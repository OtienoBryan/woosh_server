const db = require('./database/db');

async function updateCategoryTable() {
  try {
    console.log('🚀 Updating Category table with additional columns...');
    
    // Add description column
    try {
      await db.query(`
        ALTER TABLE Category 
        ADD COLUMN IF NOT EXISTS description TEXT AFTER name
      `);
      console.log('✅ Added description column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  description column already exists');
      } else {
        throw err;
      }
    }
    
    // Add orderIndex column
    try {
      await db.query(`
        ALTER TABLE Category 
        ADD COLUMN IF NOT EXISTS orderIndex INT DEFAULT 999 AFTER description
      `);
      console.log('✅ Added orderIndex column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  orderIndex column already exists');
      } else {
        throw err;
      }
    }
    
    // Add is_active column
    try {
      await db.query(`
        ALTER TABLE Category 
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER orderIndex
      `);
      console.log('✅ Added is_active column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  is_active column already exists');
      } else {
        throw err;
      }
    }
    
    // Add created_at column
    try {
      await db.query(`
        ALTER TABLE Category 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER is_active
      `);
      console.log('✅ Added created_at column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  created_at column already exists');
      } else {
        throw err;
      }
    }
    
    // Add updated_at column
    try {
      await db.query(`
        ALTER TABLE Category 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at
      `);
      console.log('✅ Added updated_at column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  updated_at column already exists');
      } else {
        throw err;
      }
    }
    
    // Add indexes
    try {
      await db.query(`
        CREATE INDEX idx_category_order ON Category(orderIndex, name)
      `);
      console.log('✅ Added idx_category_order index');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  idx_category_order index already exists');
      } else {
        console.log('⚠️  Could not create idx_category_order:', err.message);
      }
    }
    
    try {
      await db.query(`
        CREATE INDEX idx_category_active ON Category(is_active)
      `);
      console.log('✅ Added idx_category_active index');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  idx_category_active index already exists');
      } else {
        console.log('⚠️  Could not create idx_category_active:', err.message);
      }
    }
    
    // Add category_id to products table if not exists
    try {
      await db.query(`
        ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER product_name
      `);
      console.log('✅ Added category_id column to products table');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  category_id column already exists in products table');
      } else {
        console.log('⚠️  Could not add category_id to products:', err.message);
      }
    }
    
    // Add index on products.category_id
    try {
      await db.query(`
        CREATE INDEX idx_product_category ON products(category_id)
      `);
      console.log('✅ Added idx_product_category index');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  idx_product_category index already exists');
      } else {
        console.log('⚠️  Could not create idx_product_category:', err.message);
      }
    }
    
    // Add foreign key constraint
    try {
      await db.query(`
        ALTER TABLE products
        ADD CONSTRAINT fk_product_category 
        FOREIGN KEY (category_id) REFERENCES Category(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
      `);
      console.log('✅ Added foreign key constraint fk_product_category');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  fk_product_category constraint already exists');
      } else {
        console.log('⚠️  Could not add foreign key:', err.message);
      }
    }
    
    // Insert/update default categories
    console.log('\n📋 Updating default categories...');
    
    const defaultCategories = [
      { name: 'Beverages', description: 'All beverage products including soft drinks, juices, water', orderIndex: 1 },
      { name: 'Food Items', description: 'Food products and snacks', orderIndex: 2 },
      { name: 'Dairy Products', description: 'Milk, yogurt, cheese and other dairy items', orderIndex: 3 },
      { name: 'Bakery', description: 'Bread, pastries and baked goods', orderIndex: 4 },
      { name: 'Personal Care', description: 'Personal hygiene and care products', orderIndex: 5 },
      { name: 'Household', description: 'Household cleaning and maintenance products', orderIndex: 6 },
      { name: 'Confectionery', description: 'Candies, chocolates and sweets', orderIndex: 7 },
      { name: 'Frozen Foods', description: 'Frozen and refrigerated items', orderIndex: 8 },
      { name: 'Condiments & Sauces', description: 'Sauces, spices and condiments', orderIndex: 9 },
      { name: 'Other', description: 'Miscellaneous products', orderIndex: 999 }
    ];
    
    for (const cat of defaultCategories) {
      await db.query(`
        INSERT INTO Category (name, description, orderIndex, is_active) 
        VALUES (?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE 
          description = VALUES(description),
          orderIndex = VALUES(orderIndex)
      `, [cat.name, cat.description, cat.orderIndex]);
      console.log(`✅ ${cat.name}`);
    }
    
    // Display current categories
    const [categories] = await db.query('SELECT id, name, orderIndex FROM Category ORDER BY orderIndex, name');
    console.log('\n📊 Current Categories:');
    console.table(categories);
    
    console.log('\n✅ Category table update completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating Category table:', error);
    process.exit(1);
  }
}

updateCategoryTable();

