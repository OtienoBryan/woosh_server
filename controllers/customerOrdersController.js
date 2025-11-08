const db = require('../database/db');

/**
 * Get all customer orders with consolidated data (orders, riders, stores)
 * Includes pagination support
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Default limit changed to 10 records for faster initial load
 * - Parallel query execution for independent queries (count, riders, stores, status counts)
 * - Batch fetching of order items instead of subquery per order (eliminates N+1 problem)
 * - Selective field fetching (only needed columns)
 * - Optimized date filtering (using direct timestamp comparison)
 * 
 * RECOMMENDED DATABASE INDEXES for optimal performance:
 * - CREATE INDEX idx_sales_orders_created_at ON sales_orders(created_at DESC);
 * - CREATE INDEX idx_sales_orders_my_status ON sales_orders(my_status);
 * - CREATE INDEX idx_sales_orders_rider_id ON sales_orders(rider_id);
 * - CREATE INDEX idx_sales_orders_client_id ON sales_orders(client_id);
 * - CREATE INDEX idx_sales_orders_so_number ON sales_orders(so_number);
 * - CREATE INDEX idx_sales_order_items_sales_order_id ON sales_order_items(sales_order_id);
 * - CREATE INDEX idx_clients_name ON Clients(name);
 */
const getCustomerOrdersData = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, rider_id, start_date, end_date, search } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    
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
      whereConditions.push('so.created_at >= ?');
      queryParams.push(start_date + ' 00:00:00');
    }
    
    if (end_date) {
      whereConditions.push('so.created_at <= ?');
      queryParams.push(end_date + ' 23:59:59');
    }
    
    if (search) {
      whereConditions.push('(so.so_number LIKE ? OR c.name LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Execute all independent queries in parallel for better performance
    const [
      countResult,
      ridersResult,
      storesResult,
      statusCountsResult,
      totalCountResult
    ] = await Promise.all([
      // Get total count for pagination (only for filtered results)
      db.query(`
        SELECT COUNT(DISTINCT so.id) as total
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        ${whereClause}
      `, queryParams),
      
      // Get riders
      db.query('SELECT id, name, contact, status FROM Riders WHERE status = 1 ORDER BY name ASC'),
      
      // Get stores
      db.query('SELECT id, store_name, store_code FROM stores WHERE status = 1 ORDER BY store_name ASC'),
      
      // Count orders by status for filter badges
      db.query(`
        SELECT 
          my_status,
          COUNT(*) as count
        FROM sales_orders
        GROUP BY my_status
      `),
      
      // Get total count for 'all' status
      db.query('SELECT COUNT(*) as total FROM sales_orders')
    ]);
    
    const totalOrders = countResult[0][0].total;
    const riders = ridersResult[0];
    const stores = storesResult[0];
    const statusCounts = statusCountsResult[0];
    const totalCount = totalCountResult[0][0].total;
    
    // Main query - optimized to fetch only needed fields and avoid subquery in SELECT
    const ordersQuery = `
      SELECT 
        so.id,
        so.so_number,
        so.client_id,
        so.order_date,
        so.expected_delivery_date,
        so.total_amount,
        so.status,
        so.my_status,
        so.notes,
        so.created_at,
        so.updated_at,
        so.rider_id,
        so.assigned_at,
        so.returned_at,
        so.received_by_name,
        so.created_by,
        c.name as customer_name,
        c.contact as customer_contact,
        c.balance as customer_balance,
        u.full_name as salesrep,
        u.email as salesrep_email,
        r.name as rider_name,
        r.contact as rider_contact
      FROM sales_orders so
      LEFT JOIN Clients c ON so.client_id = c.id
      LEFT JOIN users u ON so.created_by = u.id
      LEFT JOIN Riders r ON so.rider_id = r.id
      ${whereClause}
      ORDER BY so.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const paginationParams = [...queryParams, limitNum, offset];
    const [orders] = await db.query(ordersQuery, paginationParams);
    
    // Batch fetch items for all orders in one query (much faster than subquery per order)
    let ordersWithItems = orders;
    if (orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      
      const [itemsResult] = await db.query(`
        SELECT 
          soi.sales_order_id,
          soi.id,
          soi.product_id,
          p.product_name,
          soi.quantity,
          soi.unit_price,
          soi.tax_type,
          soi.tax_amount,
          soi.total_price
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id IN (${placeholders})
        ORDER BY soi.sales_order_id, soi.id
      `, orderIds);
      
      // Group items by order_id
      const itemsByOrderId = {};
      itemsResult.forEach(item => {
        if (!itemsByOrderId[item.sales_order_id]) {
          itemsByOrderId[item.sales_order_id] = [];
        }
        itemsByOrderId[item.sales_order_id].push({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_type: item.tax_type,
          tax_amount: item.tax_amount,
          total_price: item.total_price
        });
      });
      
      // Attach items to orders
      ordersWithItems = orders.map(order => ({
        ...order,
        items: itemsByOrderId[order.id] || []
      }));
    }
    
    // Format status counts
    const formattedStatusCounts = {
      all: totalCount
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
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalOrders / limitNum)
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

