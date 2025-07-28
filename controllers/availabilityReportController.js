const db = require('../database/db');

exports.getAllAvailabilityReports = async (req, res) => {
  try {
    console.log('Availability reports route hit!');
    const { startDate, endDate, currentDate, page = 1, limit = 10, country, salesRep, search } = req.query;
    const isViewAll = parseInt(limit) === -1;
    const offset = isViewAll ? 0 : (parseInt(page) - 1) * parseInt(limit);
    let sql = `
      SELECT ar.id, ar.reportId, ar.comment, ar.createdAt,
             c.name AS clientName, co.name AS countryName, u.name AS salesRepName,
             ar.ProductName AS productName,ar.comment AS comment, ar.quantity
      FROM ProductReport ar
      LEFT JOIN Clients c ON ar.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON ar.userId = u.id
    `;
    let countSql = `
      SELECT COUNT(*) as total
      FROM ProductReport ar
      LEFT JOIN Clients c ON ar.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON ar.userId = u.id
    `;
    const params = [];
    const countParams = [];
    let whereConditions = [];
    if (currentDate) {
      whereConditions.push(`DATE(ar.createdAt) = ?`);
      params.push(currentDate);
      countParams.push(currentDate);
    } else if (startDate && endDate) {
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
    const [results] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;
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
    let sql = `
      SELECT ar.id, ar.reportId, ar.comment, ar.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM AvailabilityReport ar
      LEFT JOIN Clients c ON ar.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON ar.userId = u.id
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
    // CSV export logic here (not shown for brevity)
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error exporting availability reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 