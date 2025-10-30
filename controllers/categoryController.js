const db = require('../database/db');

/**
 * Get all product categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let sql = `
      SELECT 
        id, 
        name, 
        description, 
        orderIndex, 
        is_active,
        created_at,
        updated_at
      FROM Category
    `;
    
    if (active_only === 'true') {
      sql += ' WHERE is_active = TRUE';
    }
    
    sql += ' ORDER BY orderIndex ASC, name ASC';
    
    const [categories] = await db.query(sql);
    
    res.json({
      success: true,
      categories,
      total: categories.length
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch categories',
      details: err.message 
    });
  }
};

/**
 * Get a single category by ID
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [categories] = await db.query(
      'SELECT * FROM Category WHERE id = ?',
      [id]
    );
    
    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      category: categories[0]
    });
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch category',
      details: err.message 
    });
  }
};

/**
 * Get products by category
 */
exports.getProductsByCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { active_only } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      JOIN Category c ON p.category_id = c.id
      WHERE p.category_id = ?
    `;
    
    const params = [id];
    
    if (active_only === 'true') {
      sql += ' AND p.is_active = TRUE';
    }
    
    sql += ' ORDER BY p.product_name ASC';
    
    const [products] = await db.query(sql, params);
    
    res.json({
      success: true,
      products,
      total: products.length
    });
  } catch (err) {
    console.error('Error fetching products by category:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch products',
      details: err.message 
    });
  }
};

/**
 * Create a new category
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, orderIndex, is_active } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO Category (name, description, orderIndex, is_active) 
       VALUES (?, ?, ?, ?)`,
      [name, description, orderIndex || 999, is_active !== false]
    );
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      categoryId: result.insertId
    });
  } catch (err) {
    console.error('Error creating category:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create category',
      details: err.message 
    });
  }
};

/**
 * Update a category
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, orderIndex, is_active } = req.body;
    
    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (orderIndex !== undefined) {
      updates.push('orderIndex = ?');
      params.push(orderIndex);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    params.push(id);
    
    const [result] = await db.query(
      `UPDATE Category SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category updated successfully'
    });
  } catch (err) {
    console.error('Error updating category:', err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update category',
      details: err.message 
    });
  }
};

/**
 * Delete a category (soft delete by setting is_active to false)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has products
    const [products] = await db.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );
    
    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${products[0].count} products assigned to it.`
      });
    }
    
    // Soft delete
    const [result] = await db.query(
      'UPDATE Category SET is_active = FALSE WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete category',
      details: err.message 
    });
  }
};

/**
 * Get category statistics
 */
exports.getCategoryStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.orderIndex,
        c.is_active,
        COUNT(p.id) as product_count,
        SUM(p.current_stock) as total_stock,
        AVG(p.selling_price) as avg_price
      FROM Category c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      GROUP BY c.id, c.name, c.orderIndex, c.is_active
      ORDER BY c.orderIndex ASC, c.name ASC
    `);
    
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Error fetching category stats:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch category statistics',
      details: err.message 
    });
  }
};

