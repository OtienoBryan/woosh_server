const db = require('../database/db');

/**
 * Optimized Sales Dashboard Data Endpoint
 * Consolidates multiple API calls into a single optimized query
 */
exports.getSalesDashboardData = async (req, res) => {
  try {
    console.log('[getSalesDashboardData] Starting optimized dashboard data fetch...');
    const startTime = Date.now();

    // Get current month date range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Execute all queries in parallel for better performance
    const [
      salesRepsResult,
      ordersResult,
      leavesResult,
      managersResult,
      targetsResult
    ] = await Promise.allSettled([
      // 1. Get sales reps with route and region info
      db.query(`
        SELECT sr.id, sr.name, r.name as route_name, 
               r.region as region_name, r.country
        FROM SalesRep sr
        LEFT JOIN routes r ON sr.route_id_update = r.id
        WHERE sr.status = 1
        ORDER BY sr.name
      `),

      // 2. Get all orders with necessary data
      db.query(`
        SELECT 
          so.id,
          so.order_date,
          so.total_amount,
          so.my_status,
          so.client_id,
          c.client_type,
          c.route_id_update
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        WHERE so.order_date IS NOT NULL
        ORDER BY so.order_date DESC
      `),

      // 3. Get pending leaves count only
      db.query(`
        SELECT COUNT(*) as pending_count
        FROM leaves
        WHERE status = '0' OR status = 0
      `),

      // 4. Get managers
      db.query(`
        SELECT id, name, email, phoneNumber, country, region, managerTypeId
        FROM managers
        ORDER BY name
      `),

      // 5. Get all targets data
      Promise.all([
        db.query('SELECT sales_rep_id, vapes_target, pouches_target FROM distributors_targets'),
        db.query('SELECT sales_rep_id, vapes_target, pouches_target FROM key_account_targets'),
        db.query('SELECT sales_rep_id, vapes_target, pouches_target FROM retail_targets')
      ])
    ]);

    // Initialize response data
    const dashboardData = {
      stats: {
        totalSales: 0,
        totalOrders: 0,
        activeReps: 0,
        avgPerformance: 0
      },
      monthlyData: [],
      topReps: [],
      managers: [],
      pendingLeavesCount: 0,
      newOrdersCount: 0,
      pieChartData: []
    };

    // Process sales reps
    let salesReps = [];
    if (salesRepsResult.status === 'fulfilled') {
      salesReps = salesRepsResult.value[0];
      dashboardData.stats.activeReps = salesReps.length;
      console.log('[getSalesDashboardData] Sales reps found:', salesReps.length);
    }

    // Process targets
    let distTargets = [], keyTargets = [], retailTargets = [];
    if (targetsResult.status === 'fulfilled') {
      [distTargets, keyTargets, retailTargets] = [
        targetsResult.value[0][0],
        targetsResult.value[1][0],
        targetsResult.value[2][0]
      ];
      console.log('[getSalesDashboardData] Targets loaded');
    }

    // Process orders
    let orders = [];
    if (ordersResult.status === 'fulfilled') {
      orders = ordersResult.value[0];
      dashboardData.stats.totalOrders = orders.length;

      // Calculate monthly data
      const monthMap = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      orders.forEach(order => {
        if (!order.order_date || !order.total_amount) return;
        
        const date = new Date(order.order_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const amount = Number(order.total_amount);
        
        monthMap[key] = (monthMap[key] || 0) + amount;
        dashboardData.stats.totalSales += amount;
      });

      // Convert to array and sort
      dashboardData.monthlyData = Object.entries(monthMap)
        .map(([key, amount]) => {
          const [year, monthIdx] = key.split('-');
          return {
            month: `${monthNames[Number(monthIdx)]} ${year}`,
            amount: amount,
            sortKey: `${year}-${String(Number(monthIdx) + 1).padStart(2, '0')}`
          };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ month, amount }) => ({ month, amount }));

      // Calculate new orders count (my_status = 0)
      dashboardData.newOrdersCount = orders.filter(o => o.my_status === 0 || o.my_status === '0').length;

      console.log('[getSalesDashboardData] Orders processed:', orders.length);
    }

    // Calculate sales performance by rep
    if (salesReps.length > 0 && orders.length > 0) {
      // Group orders by route
      const ordersByRoute = {};
      orders.forEach(order => {
        const routeId = order.route_id_update;
        if (!routeId) return;
        
        if (!ordersByRoute[routeId]) {
          ordersByRoute[routeId] = {
            dist: { orders: 0, sales: 0, outlets: new Set() },
            key: { orders: 0, sales: 0, outlets: new Set() },
            retail: { orders: 0, sales: 0, outlets: new Set() }
          };
        }

        const clientType = order.client_type;
        const amount = Number(order.total_amount) || 0;
        
        if (clientType === 3 || clientType === '3') {
          ordersByRoute[routeId].dist.orders++;
          ordersByRoute[routeId].dist.sales += amount;
          ordersByRoute[routeId].dist.outlets.add(order.client_id);
        } else if (clientType === 2 || clientType === '2') {
          ordersByRoute[routeId].key.orders++;
          ordersByRoute[routeId].key.sales += amount;
          ordersByRoute[routeId].key.outlets.add(order.client_id);
        } else if (clientType === 1 || clientType === '1') {
          ordersByRoute[routeId].retail.orders++;
          ordersByRoute[routeId].retail.sales += amount;
          ordersByRoute[routeId].retail.outlets.add(order.client_id);
        }
      });

      // Get total outlets per route per type
      const [clientsByRoute] = await db.query(`
        SELECT route_id_update, client_type, COUNT(*) as count
        FROM Clients
        WHERE route_id_update IS NOT NULL
        GROUP BY route_id_update, client_type
      `);

      const outletCounts = {};
      clientsByRoute.forEach(row => {
        const routeId = row.route_id_update;
        if (!outletCounts[routeId]) {
          outletCounts[routeId] = { dist: 0, key: 0, retail: 0 };
        }
        const type = row.client_type;
        const count = Number(row.count) || 0;
        
        if (type === 3 || type === '3') outletCounts[routeId].dist = count;
        else if (type === 2 || type === '2') outletCounts[routeId].key = count;
        else if (type === 1 || type === '1') outletCounts[routeId].retail = count;
      });

      // Calculate performance for each rep
      const repPerformance = salesReps.map(rep => {
        const routeId = rep.route_id_update;
        const routeData = ordersByRoute[routeId] || { dist: { orders: 0, sales: 0, outlets: new Set() }, key: { orders: 0, sales: 0, outlets: new Set() }, retail: { orders: 0, sales: 0, outlets: new Set() } };
        const outlets = outletCounts[routeId] || { dist: 0, key: 0, retail: 0 };

        // Get targets
        const distTarget = distTargets.find(t => t.sales_rep_id === rep.id) || { vapes_target: 0, pouches_target: 0 };
        const keyTarget = keyTargets.find(t => t.sales_rep_id === rep.id) || { vapes_target: 0, pouches_target: 0 };
        const retailTarget = retailTargets.find(t => t.sales_rep_id === rep.id) || { vapes_target: 0, pouches_target: 0 };

        // Calculate percentages for each type
        const types = [
          {
            name: 'distributors',
            target: (Number(distTarget.vapes_target) || 0) + (Number(distTarget.pouches_target) || 0),
            sales: routeData.dist.sales,
            totalOutlets: outlets.dist,
            outletsWithOrders: routeData.dist.outlets.size
          },
          {
            name: 'key_accounts',
            target: (Number(keyTarget.vapes_target) || 0) + (Number(keyTarget.pouches_target) || 0),
            sales: routeData.key.sales,
            totalOutlets: outlets.key,
            outletsWithOrders: routeData.key.outlets.size
          },
          {
            name: 'retail',
            target: (Number(retailTarget.vapes_target) || 0) + (Number(retailTarget.pouches_target) || 0),
            sales: routeData.retail.sales,
            totalOutlets: outlets.retail,
            outletsWithOrders: routeData.retail.outlets.size
          }
        ];

        let totalPct = 0;
        types.forEach(type => {
          const outletPct = type.totalOutlets > 0 ? (type.outletsWithOrders / type.totalOutlets) * 100 : 0;
          const salesPct = type.target > 0 ? (type.sales / type.target) * 100 : 0;
          totalPct += (outletPct + salesPct) / 2;
        });

        const overall = totalPct / types.length;

        return {
          name: rep.name,
          overall: Number(overall.toFixed(1))
        };
      });

      // Sort and get top 10
      repPerformance.sort((a, b) => b.overall - a.overall);
      dashboardData.topReps = repPerformance.slice(0, 10);

      // Calculate average performance
      if (repPerformance.length > 0) {
        const avgPerf = repPerformance.reduce((sum, rep) => sum + rep.overall, 0) / repPerformance.length;
        dashboardData.stats.avgPerformance = Number(avgPerf.toFixed(1));
      }

      console.log('[getSalesDashboardData] Performance calculated for', repPerformance.length, 'reps');
    }

    // Process leaves
    if (leavesResult.status === 'fulfilled') {
      dashboardData.pendingLeavesCount = leavesResult.value[0][0].pending_count || 0;
      console.log('[getSalesDashboardData] Pending leaves:', dashboardData.pendingLeavesCount);
    }

    // Process managers
    if (managersResult.status === 'fulfilled') {
      dashboardData.managers = managersResult.value[0];
      console.log('[getSalesDashboardData] Managers found:', dashboardData.managers.length);
    }

    const endTime = Date.now();
    console.log(`[getSalesDashboardData] Completed in ${endTime - startTime}ms`);

    res.json({
      success: true,
      data: dashboardData,
      performanceMs: endTime - startTime
    });

  } catch (err) {
    console.error('[getSalesDashboardData] Error:', err);
    console.error('[getSalesDashboardData] Stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data',
      message: err.message 
    });
  }
};

/**
 * Get product performance data (lazy loaded)
 */
exports.getProductPerformance = async (req, res) => {
  try {
    console.log('[getProductPerformance] Starting...');
    const { productType, startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'AND so.order_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const typeFilter = productType ? 
      (productType === 'vape' ? 'AND p.category_id IN (1, 3)' : 'AND p.category_id IN (4, 5)') : '';

    const [products] = await db.query(`
      SELECT 
        p.id,
        p.product_name,
        p.category_id,
        SUM(soi.quantity) as total_quantity_sold,
        SUM(soi.quantity * soi.unit_price) as total_sales_value
      FROM products p
      LEFT JOIN sales_order_items soi ON p.id = soi.product_id
      LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE 1=1 ${dateFilter} ${typeFilter}
      GROUP BY p.id, p.product_name, p.category_id
      HAVING total_quantity_sold > 0
      ORDER BY total_sales_value DESC
    `, params);

    console.log('[getProductPerformance] Products found:', products.length);

    res.json({
      success: true,
      data: products
    });

  } catch (err) {
    console.error('[getProductPerformance] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch product performance',
      message: err.message 
    });
  }
};

/**
 * Get current month pie chart data (lazy loaded)
 */
exports.getCurrentMonthPieData = async (req, res) => {
  try {
    console.log('[getCurrentMonthPieData] Starting...');
    
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [results] = await db.query(`
      SELECT 
        CASE 
          WHEN p.category_id IN (1, 3) THEN 'Vapes'
          WHEN p.category_id IN (4, 5) THEN 'Pouches'
          ELSE 'Other'
        END as product_type,
        SUM(soi.quantity * soi.unit_price) as total_value
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.sales_order_id = so.id
      JOIN products p ON soi.product_id = p.id
      WHERE so.order_date BETWEEN ? AND ?
      GROUP BY product_type
      HAVING product_type IN ('Vapes', 'Pouches')
    `, [startDate, endDate]);

    console.log('[getCurrentMonthPieData] Data calculated');

    res.json({
      success: true,
      data: results.map(r => ({
        type: r.product_type,
        value: Number(r.total_value) || 0
      }))
    });

  } catch (err) {
    console.error('[getCurrentMonthPieData] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pie chart data',
      message: err.message 
    });
  }
};

