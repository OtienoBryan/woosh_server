const db = require('../database/db');

exports.getAllAvailabilityReports = async (req, res) => {
  try {
    console.log('Availability reports route hit!');
    const { startDate, endDate, currentDate, page = 1, limit = 10, country, salesRep, search } = req.query;
    const isViewAll = parseInt(limit) === -1;
    const offset = isViewAll ? 0 : (parseInt(page) - 1) * parseInt(limit);
    
    // Optimized query with indexed columns first and category information
    let sql = `
      SELECT ar.id, ar.reportId, ar.comment, ar.createdAt, ar.clientId, ar.userId, ar.productId,
             c.name AS clientName, co.name AS countryName, u.name AS salesRepName,
             ar.ProductName AS productName, ar.quantity,
             cat.id AS categoryId, cat.name AS categoryName, 
             COALESCE(cat.orderIndex, 999) AS categoryOrder
      FROM ProductReport ar
      LEFT JOIN Clients c ON ar.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON ar.userId = u.id
      LEFT JOIN products p ON ar.productId = p.id
      LEFT JOIN Category cat ON p.category_id = cat.id
    `;
    let countSql = `
      SELECT COUNT(*) as total
      FROM ProductReport ar
      LEFT JOIN Clients c ON ar.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON ar.userId = u.id
      LEFT JOIN products p ON ar.productId = p.id
      LEFT JOIN Category cat ON p.category_id = cat.id
    `;
    const params = [];
    const countParams = [];
    let whereConditions = [];
    
    // Date filtering - optimized for index usage
    // Always require a date filter for performance (defaults to today on frontend)
    if (currentDate) {
      whereConditions.push(`DATE(ar.createdAt) = ?`);
      params.push(currentDate);
      countParams.push(currentDate);
    } else if (startDate && endDate) {
      // Use BETWEEN for date range (uses index efficiently)
      whereConditions.push(`DATE(ar.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push(`DATE(ar.createdAt) >= ?`);
      params.push(startDate);
      countParams.push(startDate);
    } else if (endDate) {
      whereConditions.push(`DATE(ar.createdAt) <= ?`);
      params.push(endDate);
      countParams.push(endDate);
    } else {
      // If no date provided, default to today for performance
      const today = new Date().toISOString().split('T')[0];
      whereConditions.push(`DATE(ar.createdAt) = ?`);
      params.push(today);
      countParams.push(today);
    }
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
      countParams.push(country);
    }
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
      countParams.push(salesRep);
    }
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR ar.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }
    sql += ` ORDER BY ar.createdAt DESC`;
    if (!isViewAll) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
    }
    
    // Log query for performance monitoring
    console.log(`Fetching availability reports with date filter: ${startDate || endDate || currentDate || 'today'}`);
    
    const [results] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;
    
    console.log(`Query returned ${results.length} reports out of ${total} total`);
    
    res.json({ 
      success: true, 
      reports: results,
      total,
      page: isViewAll ? 1 : parseInt(page),
      limit: isViewAll ? total : parseInt(limit),
      totalPages: isViewAll ? 1 : Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching availability reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportAvailabilityReportsCSV = async (req, res) => {
  try {
    console.log('Availability reports CSV export route hit!');
    const { startDate, endDate, currentDate, country, salesRep, search } = req.query;
    // Fetch ALL matching rows (no pagination) with category info - same base as UI
    let sql = `
      SELECT ar.id, ar.reportId, ar.comment, ar.createdAt, ar.clientId, ar.userId, ar.productId,
             c.name AS clientName, co.name AS countryName, u.name AS salesRepName,
             ar.ProductName AS productName, ar.quantity,
             cat.id AS categoryId, cat.name AS categoryName,
             COALESCE(cat.orderIndex, 999) AS categoryOrder
      FROM ProductReport ar
      LEFT JOIN Clients c ON ar.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON ar.userId = u.id
      LEFT JOIN products p ON ar.productId = p.id
      LEFT JOIN Category cat ON p.category_id = cat.id
    `;
    const params = [];
    let whereConditions = [];
    if (currentDate) {
      whereConditions.push(`DATE(ar.createdAt) = ?`);
      params.push(currentDate);
    } else if (startDate && endDate) {
      whereConditions.push(`DATE(ar.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push(`DATE(ar.createdAt) >= ?`);
      params.push(startDate);
    } else if (endDate) {
      whereConditions.push(`DATE(ar.createdAt) <= ?`);
      params.push(endDate);
    }
    if (country && country !== 'all') {
      whereConditions.push(`co.name = ?`);
      params.push(country);
    }
    if (salesRep && salesRep !== 'all') {
      whereConditions.push(`u.name = ?`);
      params.push(salesRep);
    }
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR ar.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      sql += whereClause;
    }
    sql += ` ORDER BY ar.createdAt DESC`;

    const [results] = await db.query(sql, params);

    // Build product map and sorted product list (same ordering as UI)
    const productMap = new Map();
    for (const r of results) {
      const productKey = (r.productName || '').trim();
      if (productKey && !productMap.has(productKey)) {
        productMap.set(productKey, {
          name: productKey,
          categoryName: r.categoryName || 'Uncategorized',
          categoryOrder: r.categoryOrder || 999
        });
      }
    }
    const products = Array.from(productMap.values())
      .sort((a, b) => {
        if (a.categoryOrder !== b.categoryOrder) return a.categoryOrder - b.categoryOrder;
        if (a.categoryName !== b.categoryName) return (a.categoryName || '').localeCompare(b.categoryName || '');
        return (a.name || '').localeCompare(b.name || '');
      })
      .map(p => p.name);

    // Group data by clientName|date and aggregate quantities like UI
    const outletMap = new Map();
    for (const r of results) {
      const dateKey = new Date(r.createdAt).toISOString().split('T')[0];
      const clientNameKey = (r.clientName || '').trim();
      const outletKey = `${clientNameKey}|${dateKey}`;
      if (!outletMap.has(outletKey)) {
        outletMap.set(outletKey, {
          clientName: clientNameKey,
          reportDate: dateKey,
          salesReps: new Set(),
          productQuantities: new Map()
        });
      }
      const outlet = outletMap.get(outletKey);
      const productKey = (r.productName || '').trim();
      if (r.salesRepName) {
        outlet.salesReps.add((r.salesRepName || '').trim());
      }
      const existing = outlet.productQuantities.get(productKey) || { quantity: 0 };
      outlet.productQuantities.set(productKey, { quantity: existing.quantity + (r.quantity || 0) });
    }
    const outlets = Array.from(outletMap.values()).sort((a, b) => {
      const dateComparison = new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
      if (dateComparison !== 0) return dateComparison;
      return (a.clientName || '').localeCompare(b.clientName || '');
    });

    // Build CSV with two header rows: categories, then product names
    const csvEscape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (s.includes('"') || s.includes(',') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const categoryHeader = ['Outlet', 'Sales Rep', 'Date', ...products.map(p => (productMap.get(p)?.categoryName || 'Uncategorized'))];
    const productHeader = ['Outlet', 'Sales Rep', 'Date', ...products];

    const lines = [];
    // Metadata/title block
    const title = 'Availability Report';
    const generatedAt = new Date().toISOString();
    let dateLabel = '';
    if (currentDate) {
      dateLabel = `Date: ${currentDate}`;
    } else if (startDate && endDate) {
      dateLabel = `Date Range: ${startDate} to ${endDate}`;
    } else if (startDate) {
      dateLabel = `From: ${startDate}`;
    } else if (endDate) {
      dateLabel = `Until: ${endDate}`;
    } else {
      dateLabel = 'Date: Today';
    }
    const filterCountry = country && country !== 'all' ? `Country: ${country}` : '';
    const filterSalesRep = salesRep && salesRep !== 'all' ? `Sales Rep: ${salesRep}` : '';
    const filterSearch = search && search.trim() ? `Search: ${search.trim()}` : '';

    lines.push([csvEscape(title)].join(','));
    lines.push([csvEscape(dateLabel)].join(','));
    const filtersRow = [filterCountry, filterSalesRep, filterSearch].filter(Boolean).join(' | ');
    if (filtersRow) lines.push([csvEscape(`Filters: ${filtersRow}`)].join(','));
    lines.push([csvEscape(`Generated At: ${generatedAt}`)].join(','));
    lines.push(''); // empty line before table

    // Table headers
    lines.push(categoryHeader.map(csvEscape).join(','));
    lines.push(productHeader.map(csvEscape).join(','));

    for (const outlet of outlets) {
      const salesRepStr = Array.from(outlet.salesReps || []).join(' / ');
      const row = [outlet.clientName, salesRepStr, outlet.reportDate];
      for (const product of products) {
        const cell = outlet.productQuantities.get(product);
        row.push(cell ? cell.quantity : 0);
      }
      lines.push(row.map(csvEscape).join(','));
    }

    const csvContent = lines.join('\n');
    const filenameParts = [];
    if (currentDate) filenameParts.push(currentDate);
    if (startDate && endDate) filenameParts.push(`${startDate}_to_${endDate}`);
    const filename = `availability_reports_${filenameParts.join('_') || 'export'}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error exporting availability reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 