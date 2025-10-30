console.log('=== MY VISIBILITY REPORT CONTROLLER IS LOADING ===');

const db = require('../config/database');

// Fetch all my visibility reports with pagination and server-side filtering
exports.getAllMyVisibilityReports = async (req, res) => {
  console.log('getAllMyVisibilityReports function called');
  try {
    // Extract query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const outlet = req.query.outlet || '';
    const country = req.query.country || '';
    const salesRep = req.query.salesRep || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build WHERE clause dynamically
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(c.name LIKE ? OR vr.comment LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (outlet) {
      whereConditions.push('c.name = ?');
      queryParams.push(outlet);
    }

    if (country) {
      whereConditions.push('co.name = ?');
      queryParams.push(country);
    }

    if (salesRep) {
      whereConditions.push('sr.name = ? AND sr.status = 1');
      queryParams.push(salesRep);
    }

    if (startDate && endDate) {
      whereConditions.push('DATE(vr.createdAt) BETWEEN ? AND ?');
      queryParams.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push('DATE(vr.createdAt) >= ?');
      queryParams.push(startDate);
    } else if (endDate) {
      whereConditions.push('DATE(vr.createdAt) <= ?');
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep sr ON vr.userId = sr.id
      ${whereClause}
    `;
    
    const [countResult] = await db.query(countSql, queryParams);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get paginated data with optimized query
    const dataSql = `
      SELECT 
        vr.id,
        vr.reportId,
        vr.comment,
        vr.imageUrl,
        vr.createdAt,
        vr.clientId,
        vr.userId,
        c.name as outletName,
        c.name as companyName,
        co.name as country,
        sr.name as salesRep
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep sr ON vr.userId = sr.id
      ${whereClause}
      ORDER BY vr.createdAt DESC
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...queryParams, limit, offset];
    const [results] = await db.query(dataSql, dataParams);

    res.json({ 
      success: true, 
      data: results,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('Error in getAllMyVisibilityReports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get unique filter options (outlets, countries, and sales reps)
exports.getFilterOptions = async (req, res) => {
  try {
    const outletsSql = `
      SELECT DISTINCT c.name as outlet
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      WHERE c.name IS NOT NULL
      ORDER BY c.name
    `;
    
    const countriesSql = `
      SELECT DISTINCT co.name as country
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      WHERE co.name IS NOT NULL
      ORDER BY co.name
    `;

    const salesRepsSql = `
      SELECT DISTINCT sr.name as salesRep
      FROM VisibilityReport vr
      LEFT JOIN SalesRep sr ON vr.userId = sr.id
      WHERE sr.name IS NOT NULL AND sr.status = 1
      ORDER BY sr.name
    `;

    const [outlets] = await db.query(outletsSql);
    const [countries] = await db.query(countriesSql);
    const [salesReps] = await db.query(salesRepsSql);

    res.json({
      success: true,
      data: {
        outlets: outlets.map(o => o.outlet),
        countries: countries.map(c => c.country),
        salesReps: salesReps.map(s => s.salesRep)
      }
    });
  } catch (err) {
    console.error('Error in getFilterOptions:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 