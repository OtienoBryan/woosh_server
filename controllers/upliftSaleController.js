const db = require('../database/db');

// Get all uplift sales with pagination and filters
const getUpliftSales = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      status,
      clientId,
      userId,
      outletAccountId,
      salesRepId,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (status) {
      whereConditions.push('us.status = ?');
      queryParams.push(status);
    }

    if (clientId) {
      whereConditions.push('us.clientId = ?');
      queryParams.push(clientId);
    }

    if (userId) {
      whereConditions.push('us.userId = ?');
      queryParams.push(userId);
    }

    if (outletAccountId) {
      console.log('Filtering by outlet account ID:', outletAccountId);
      whereConditions.push('c.outlet_account = ?');
      queryParams.push(parseInt(outletAccountId));
    }

    if (salesRepId) {
      console.log('Filtering by sales rep ID:', salesRepId);
      whereConditions.push('us.userId = ?');
      queryParams.push(parseInt(salesRepId));
    }

    if (startDate) {
      whereConditions.push('DATE(us.createdAt) >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(us.createdAt) <= ?');
      queryParams.push(endDate);
    }

    if (search) {
      whereConditions.push('(c.name LIKE ? OR u.name LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM UpliftSale us
      LEFT JOIN Clients c ON us.clientId = c.id
      LEFT JOIN SalesRep u ON us.userId = u.id
      ${whereClause}
    `;

    const [countResult] = await db.execute(countQuery, queryParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get uplift sales with pagination
    const dataQuery = `
      SELECT 
        us.id,
        us.clientId,
        us.userId,
        us.status,
        us.totalAmount,
        us.createdAt,
        c.name as client_name,
        c.name as client_company_name,
        u.name as user_name
      FROM UpliftSale us
      LEFT JOIN Clients c ON us.clientId = c.id
      LEFT JOIN SalesRep u ON us.userId = u.id
      ${whereClause}
      ORDER BY us.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), parseInt(offset));
    
    console.log('Final query:', dataQuery);
    console.log('Query params:', queryParams);
    
    const [rows] = await db.execute(dataQuery, queryParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: total,
        items_per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching uplift sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uplift sales',
      message: error.message
    });
  }
};

// Get a single uplift sale by ID
const getUpliftSale = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        us.id,
        us.clientId,
        us.userId,
        us.status,
        us.totalAmount,
        us.createdAt,
        c.name as client_name,
        c.name as client_company_name,
        u.name as user_name
      FROM UpliftSale us
      LEFT JOIN Clients c ON us.clientId = c.id
      LEFT JOIN SalesRep u ON us.userId = u.id
      WHERE us.id = ?
    `;

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Uplift sale not found'
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching uplift sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uplift sale',
      message: error.message
    });
  }
};

// Create a new uplift sale
const createUpliftSale = async (req, res) => {
  try {
    const { clientId, userId, totalAmount, status = 'pending' } = req.body;

    // Validate required fields
    if (!clientId || !userId || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'clientId, userId, and totalAmount are required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: pending, approved, rejected, completed'
      });
    }

    const query = `
      INSERT INTO UpliftSale (clientId, userId, status, totalAmount, createdAt)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const [result] = await db.execute(query, [clientId, userId, status, totalAmount]);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        clientId,
        userId,
        status,
        totalAmount,
        createdAt: new Date().toISOString()
      },
      message: 'Uplift sale created successfully'
    });
  } catch (error) {
    console.error('Error creating uplift sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create uplift sale',
      message: error.message
    });
  }
};

// Update an uplift sale
const updateUpliftSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, totalAmount } = req.body;

    // Validate status if provided
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: pending, approved, rejected, completed'
        });
      }
    }

    // Build update query dynamically
    let updateFields = [];
    let queryParams = [];

    if (status !== undefined) {
      updateFields.push('status = ?');
      queryParams.push(status);
    }

    if (totalAmount !== undefined) {
      updateFields.push('totalAmount = ?');
      queryParams.push(totalAmount);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    queryParams.push(id);

    const query = `
      UPDATE UpliftSale 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const [result] = await db.execute(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Uplift sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Uplift sale updated successfully'
    });
  } catch (error) {
    console.error('Error updating uplift sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update uplift sale',
      message: error.message
    });
  }
};

// Delete an uplift sale
const deleteUpliftSale = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM UpliftSale WHERE id = ?';
    const [result] = await db.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Uplift sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Uplift sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting uplift sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete uplift sale',
      message: error.message
    });
  }
};

// Get uplift sales summary/statistics
const getUpliftSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (startDate) {
      whereConditions.push('DATE(createdAt) >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(createdAt) <= ?');
      queryParams.push(endDate);
    }

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as totalSales,
        COALESCE(SUM(totalAmount), 0) as totalAmount,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedCount,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCount
      FROM UpliftSale
      ${whereClause}
    `;

    const [rows] = await db.execute(query, queryParams);

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching uplift sales summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uplift sales summary',
      message: error.message
    });
  }
};

// Get uplift sale items by uplift sale ID
const getUpliftSaleItems = async (req, res) => {
  try {
    const { upliftSaleId } = req.params;
    console.log('Getting items for uplift sale ID:', upliftSaleId);

    // First check if the uplift sale exists
    const [saleCheck] = await db.execute('SELECT id FROM UpliftSale WHERE id = ?', [upliftSaleId]);
    if (saleCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Uplift sale not found'
      });
    }

    const query = `
      SELECT 
        usi.id,
        usi.upliftSaleId,
        usi.productId,
        usi.quantity,
        usi.unitPrice,
        usi.total,
        usi.createdAt,
        p.product_name,
        p.product_code,
        p.unit_of_measure
      FROM UpliftSaleItem usi
      LEFT JOIN products p ON usi.productId = p.id
      WHERE usi.upliftSaleId = ?
      ORDER BY usi.createdAt ASC
    `;

    console.log('Executing query:', query);
    console.log('With params:', [upliftSaleId]);

    const [rows] = await db.execute(query, [upliftSaleId]);
    console.log('Query result:', rows.length, 'items found');

    // Map the data to match the expected format (similar to sales order items)
    const mappedItems = rows.map(item => ({
      id: item.id,
      upliftSaleId: item.upliftSaleId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      total: parseFloat(item.total),
      createdAt: item.createdAt,
      product_name: item.product_name || `Product ${item.productId}`,
      product_code: item.product_code || 'No Code',
      unit_of_measure: item.unit_of_measure || 'PCS'
    }));

    console.log('Mapped items:', mappedItems);

    res.json({
      success: true,
      data: mappedItems
    });
  } catch (error) {
    console.error('Error fetching uplift sale items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch uplift sale items',
      message: error.message
    });
  }
};

// Create uplift sale item
const createUpliftSaleItem = async (req, res) => {
  try {
    const { upliftSaleId } = req.params;
    const { productId, quantity, unitPrice } = req.body;

    // Validate required fields
    if (!productId || !quantity || !unitPrice) {
      return res.status(400).json({
        success: false,
        error: 'productId, quantity, and unitPrice are required'
      });
    }

    // Calculate total
    const total = quantity * unitPrice;

    const query = `
      INSERT INTO UpliftSaleItem (upliftSaleId, productId, quantity, unitPrice, total, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await db.execute(query, [upliftSaleId, productId, quantity, unitPrice, total]);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        upliftSaleId: parseInt(upliftSaleId),
        productId,
        quantity,
        unitPrice,
        total,
        createdAt: new Date().toISOString()
      },
      message: 'Uplift sale item created successfully'
    });
  } catch (error) {
    console.error('Error creating uplift sale item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create uplift sale item',
      message: error.message
    });
  }
};

// Update uplift sale item
const updateUpliftSaleItem = async (req, res) => {
  try {
    const { upliftSaleId, itemId } = req.params;
    const { quantity, unitPrice } = req.body;

    // Build update query dynamically
    let updateFields = [];
    let queryParams = [];

    if (quantity !== undefined) {
      updateFields.push('quantity = ?');
      queryParams.push(quantity);
    }

    if (unitPrice !== undefined) {
      updateFields.push('unitPrice = ?');
      queryParams.push(unitPrice);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Recalculate total if quantity or unitPrice changed
    if (quantity !== undefined || unitPrice !== undefined) {
      // Get current values first
      const getCurrentQuery = 'SELECT quantity, unitPrice FROM UpliftSaleItem WHERE id = ? AND upliftSaleId = ?';
      const [currentRows] = await db.execute(getCurrentQuery, [itemId, upliftSaleId]);
      
      if (currentRows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Uplift sale item not found'
        });
      }

      const currentQuantity = quantity !== undefined ? quantity : currentRows[0].quantity;
      const currentUnitPrice = unitPrice !== undefined ? unitPrice : currentRows[0].unitPrice;
      const newTotal = currentQuantity * currentUnitPrice;

      updateFields.push('total = ?');
      queryParams.push(newTotal);
    }

    queryParams.push(itemId, upliftSaleId);

    const query = `
      UPDATE UpliftSaleItem 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND upliftSaleId = ?
    `;

    const [result] = await db.execute(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Uplift sale item not found'
      });
    }

    res.json({
      success: true,
      message: 'Uplift sale item updated successfully'
    });
  } catch (error) {
    console.error('Error updating uplift sale item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update uplift sale item',
      message: error.message
    });
  }
};

// Delete uplift sale item
const deleteUpliftSaleItem = async (req, res) => {
  try {
    const { upliftSaleId, itemId } = req.params;

    const query = 'DELETE FROM UpliftSaleItem WHERE id = ? AND upliftSaleId = ?';
    const [result] = await db.execute(query, [itemId, upliftSaleId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Uplift sale item not found'
      });
    }

    res.json({
      success: true,
      message: 'Uplift sale item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting uplift sale item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete uplift sale item',
      message: error.message
    });
  }
};

// Get outlet accounts
const getOutletAccounts = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        oa.id,
        oa.name as account_name
      FROM outlet_accounts oa
      INNER JOIN Clients c ON c.outlet_account = oa.id
      ORDER BY oa.name ASC
    `;

    const [rows] = await db.execute(query);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching outlet accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch outlet accounts',
      message: error.message
    });
  }
};

// Get sales reps
const getSalesReps = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        sr.id,
        sr.name
      FROM SalesRep sr
      INNER JOIN UpliftSale us ON us.userId = sr.id
      ORDER BY sr.name ASC
    `;

    const [rows] = await db.execute(query);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales reps',
      message: error.message
    });
  }
};

// Debug endpoint to check database state
const debugUpliftData = async (req, res) => {
  try {
    console.log('=== Debug Uplift Data ===');
    
    // Check UpliftSale count
    const [saleCount] = await db.execute('SELECT COUNT(*) as count FROM UpliftSale');
    console.log('UpliftSale count:', saleCount[0].count);
    
    // Check UpliftSaleItem count
    const [itemCount] = await db.execute('SELECT COUNT(*) as count FROM UpliftSaleItem');
    console.log('UpliftSaleItem count:', itemCount[0].count);
    
    // Check products count
    const [productCount] = await db.execute('SELECT COUNT(*) as count FROM products');
    console.log('Products count:', productCount[0].count);
    
    // Get sample data
    const [sales] = await db.execute('SELECT id, clientId, userId, status, totalAmount FROM UpliftSale LIMIT 3');
    const [items] = await db.execute('SELECT id, upliftSaleId, productId, quantity, unitPrice, total FROM UpliftSaleItem LIMIT 3');
    const [products] = await db.execute('SELECT id, product_name, product_code FROM products LIMIT 3');
    
    res.json({
      success: true,
      data: {
        upliftSales: {
          count: saleCount[0].count,
          samples: sales
        },
        upliftSaleItems: {
          count: itemCount[0].count,
          samples: items
        },
        products: {
          count: productCount[0].count,
          samples: products
        }
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      message: error.message
    });
  }
};

module.exports = {
  getUpliftSales,
  getUpliftSale,
  createUpliftSale,
  updateUpliftSale,
  deleteUpliftSale,
  getUpliftSalesSummary,
  getUpliftSaleItems,
  createUpliftSaleItem,
  updateUpliftSaleItem,
  deleteUpliftSaleItem,
  getOutletAccounts,
  getSalesReps,
  debugUpliftData
};
