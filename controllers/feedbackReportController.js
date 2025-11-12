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
    
    // Create CSV header information
    const exportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let filterDate;
    if (currentDate) {
      filterDate = new Date(currentDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const end = new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      filterDate = startDate === endDate ? start : `${start} - ${end}`;
    } else if (startDate) {
      filterDate = `From ${new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else if (endDate) {
      filterDate = `Until ${new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })}`;
    } else {
      filterDate = 'All Dates';
    }
    
    const reportCount = results.length;
    
    // Create CSV content with header information - matching table structure
    const csvHeader = [
      ['Feedback Reports Export'],
      [''],
      ['Export Date:', exportDate],
      ['Filter Date:', filterDate],
      ['Filter Country:', country && country !== 'all' ? country : 'All Countries'],
      ['Filter Sales Rep:', salesRep && salesRep !== 'all' ? salesRep : 'All Sales Reps'],
      ['Filter Search:', search && search.trim() ? search.trim() : 'No Search'],
      ['Total Reports:', reportCount.toString()],
      [''],
      ['Outlet', 'Country', 'Sales Rep', 'Comment', 'Date']
    ];
    
    // Map data to match table structure exactly
    const csvData = results.map(row => [
      row.outlet || 'N/A',
      row.country || 'N/A',
      row.salesRep || 'N/A',
      row.comment || 'N/A',
      new Date(row.createdAt).toLocaleString()
    ]);
    
    // Combine header and data, escape quotes properly
    const csvContent = [...csvHeader, ...csvData]
      .map(row => row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes
        return `"${cellStr.replace(/"/g, '""')}"`;
      }).join(','))
      .join('\n');
    
    // Set headers for CSV download
    const filename = `feedback-reports-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Add BOM for Excel compatibility and send CSV
    const csvWithBOM = '\ufeff' + csvContent;
    res.send(csvWithBOM);
  } catch (err) {
    console.error('Error exporting feedback reports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 