const db = require('../database/db');

/**
 * Get all customer orders with consolidated data (orders, riders, stores)
 * Includes pagination support
 */
const getCustomerOrdersData = async (req, res) => {
  try {
    const { page = 1, limit = 25, status, rider_id, start_date, end_date, search } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause based on filters
    let whereConditions = [];
    let queryParams = [];
    
    if (status && status !== 'all') {
      whereConditions.push('so.my_status = ?');
      queryParams.push(parseInt(status));
    }
    
    if (rider_id) {
      whereConditions.push('so.rider_id = ?');
      queryParams.push(parseInt(rider_id));
    }
    
    if (start_date) {
      whereConditions.push('DATE(so.created_at) >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('DATE(so.created_at) <= ?');
      queryParams.push(end_date);
    }
    
    if (search) {
      whereConditions.push('(so.so_number LIKE ? OR c.name LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT so.id) as total
      FROM sales_orders so
      LEFT JOIN Clients c ON so.client_id = c.id
      ${whereClause}
    `;
    
    const [countResult] = await db.query(countQuery, queryParams);
    const totalOrders = countResult[0].total;
    
    // Main query with all needed joins to avoid N+1
    const ordersQuery = `
      SELECT 
        so.*,
        c.name as customer_name,
        c.contact as customer_contact,
        c.balance as customer_balance,
        u.full_name as salesrep,
        u.email as salesrep_email,
        r.name as rider_name,
        r.contact as rider_contact,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', soi.id,
              'product_id', soi.product_id,
              'product_name', p.product_name,
              'quantity', soi.quantity,
              'unit_price', soi.unit_price,
              'tax_type', soi.tax_type,
              'tax_amount', soi.tax_amount,
              'total_price', soi.total_price
            )
          )
          FROM sales_order_items soi
          LEFT JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = so.id
        ) as items
      FROM sales_orders so
      LEFT JOIN Clients c ON so.client_id = c.id
      LEFT JOIN users u ON so.created_by = u.id
      LEFT JOIN Riders r ON so.rider_id = r.id
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const paginationParams = [...queryParams, parseInt(limit), offset];
    const [orders] = await db.query(ordersQuery, paginationParams);
    
    // Parse JSON items
    const ordersWithItems = orders.map(order => ({
      ...order,
      items: order.items ? JSON.parse(order.items) : []
    }));
    
    // Get riders and stores in parallel
    const [[riders], [stores]] = await Promise.all([
      db.query('SELECT id, name, contact, status FROM Riders WHERE status = 1 ORDER BY name ASC'),
      db.query('SELECT id, store_name, store_code FROM stores WHERE status = 1 ORDER BY store_name ASC')
    ]);
    
    // Count orders by status for filter badges
    const statusCountQuery = `
      SELECT 
        my_status,
        COUNT(*) as count
      FROM sales_orders
      GROUP BY my_status
    `;
    const [statusCounts] = await db.query(statusCountQuery);
    
    // Also get total count
    const [totalCountResult] = await db.query('SELECT COUNT(*) as total FROM sales_orders');
    
    // Format status counts
    const formattedStatusCounts = {
      all: totalCountResult[0].total
    };
    
    statusCounts.forEach(sc => {
      formattedStatusCounts[sc.my_status] = sc.count;
    });
    
    res.json({
      success: true,
      data: {
        orders: ordersWithItems,
        riders,
        stores,
        statusCounts: formattedStatusCounts,
        pagination: {
          total: totalOrders,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalOrders / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching customer orders data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer orders data',
      details: error.message
    });
  }
};

module.exports = {
  getCustomerOrdersData
};

