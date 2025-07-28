const db = require('../database/db');

exports.getAllFeedbackReports = async (req, res) => {
  try {
    console.log('Feedback reports route hit!');
    const { startDate, endDate, currentDate, page = 1, limit = 10, country, salesRep, search } = req.query;
    const isViewAll = parseInt(limit) === -1;
    const offset = isViewAll ? 0 : (parseInt(page) - 1) * parseInt(limit);
    let sql = `
      SELECT fr.id, fr.reportId, fr.comment, fr.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM FeedbackReport fr
      LEFT JOIN Clients c ON fr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON fr.userId = u.id
    `;
    let countSql = `
      SELECT COUNT(*) as total
      FROM FeedbackReport fr
      LEFT JOIN Clients c ON fr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON fr.userId = u.id
    `;
    const params = [];
    const countParams = [];
    let whereConditions = [];
    if (currentDate) {
      whereConditions.push(`DATE(fr.createdAt) = ?`);
      params.push(currentDate);
      countParams.push(currentDate);
    } else if (startDate && endDate) {
      whereConditions.push(`DATE(fr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push(`DATE(fr.createdAt) >= ?`);
      params.push(startDate);
      countParams.push(startDate);
    } else if (endDate) {
      whereConditions.push(`DATE(fr.createdAt) <= ?`);
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
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR fr.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }
    sql += ` ORDER BY fr.createdAt DESC`;
    if (!isViewAll) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);
    }
    const [results] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;
    res.json({ 
      success: true, 
      data: results,
      pagination: {
        page: isViewAll ? 1 : parseInt(page),
        limit: isViewAll ? total : parseInt(limit),
        total,
        totalPages: isViewAll ? 1 : Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching feedback reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportFeedbackReportsCSV = async (req, res) => {
  try {
    console.log('Feedback reports CSV export route hit!');
    const { startDate, endDate, currentDate, country, salesRep, search } = req.query;
    let sql = `
      SELECT fr.id, fr.reportId, fr.comment, fr.createdAt,
             c.name AS outlet, co.name AS country, u.name AS salesRep
      FROM FeedbackReport fr
      LEFT JOIN Clients c ON fr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON fr.userId = u.id
    `;
    const params = [];
    let whereConditions = [];
    if (currentDate) {
      whereConditions.push(`DATE(fr.createdAt) = ?`);
      params.push(currentDate);
    } else if (startDate && endDate) {
      whereConditions.push(`DATE(fr.createdAt) BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    } else if (startDate) {
      whereConditions.push(`DATE(fr.createdAt) >= ?`);
      params.push(startDate);
    } else if (endDate) {
      whereConditions.push(`DATE(fr.createdAt) <= ?`);
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
      whereConditions.push(`(c.name LIKE ? OR co.name LIKE ? OR u.name LIKE ? OR fr.comment LIKE ?)`);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      sql += whereClause;
    }
    sql += ` ORDER BY fr.createdAt DESC`;
    const [results] = await db.query(sql, params);
    // CSV export logic here (not shown for brevity)
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error exporting feedback reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 