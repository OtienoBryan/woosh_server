const db = require('../database/db');

const leaveRequestController = {
  // Get all leave requests
  getAllLeaveRequests: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT lr.*, s.name AS employee_name
        FROM leave_requests lr
        LEFT JOIN staff s ON lr.employee_id = s.id
        ORDER BY lr.start_date DESC, lr.id DESC
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      res.status(500).json({ message: 'Failed to fetch leave requests', error: error.message });
    }
  },

  // Get all employee leaves (with leave type name)
  getEmployeeLeaves: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT lr.*, s.name AS employee_name, lt.name AS leave_type
        FROM leave_requests lr
        LEFT JOIN staff s ON lr.employee_id = s.id
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        ORDER BY lr.start_date DESC, lr.id DESC
      `);
      console.log(`[getEmployeeLeaves] Returned rows:`, rows.length);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching employee leaves:', error);
      res.status(500).json({ message: 'Failed to fetch employee leaves', error: error.message });
    }
  },

  updateLeaveRequestStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['1', '2', 1, 2].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    try {
      const [result] = await db.query(
        'UPDATE leave_requests SET status = ? WHERE id = ?',
        [status, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Leave request not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating leave request status:', error);
      res.status(500).json({ message: 'Failed to update leave request status', error: error.message });
    }
  },

  // Get leave report for all staff (annual leave balance)
  getLeaveReport: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;
      const prevYearStart = `${previousYear}-01-01`;
      const prevYearEnd = `${previousYear}-12-31`;

      // Get all staff
      const [staff] = await db.query(`
        SELECT id, name, department, empl_no
        FROM staff
        WHERE is_active = TRUE
        ORDER BY name
      `);

      // Get annual leave type ID (assuming it exists, if not we'll handle it)
      const [leaveTypes] = await db.query(`
        SELECT id, name FROM leave_types WHERE LOWER(name) LIKE '%annual%' OR LOWER(name) LIKE '%annual leave%'
      `);
      
      const annualLeaveTypeId = leaveTypes.length > 0 ? leaveTypes[0].id : null;

      // Get all approved annual leave requests for the current year
      // Status can be 'approved' (string) or '1' (number/string) depending on how it's stored
      const [leaveRequests] = await db.query(`
        SELECT 
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lr.is_half_day,
          lt.name AS leave_type_name
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE (lr.status = 'approved' OR lr.status = '1' OR lr.status = 1)
          AND lr.start_date >= ? 
          AND lr.start_date <= ?
          ${annualLeaveTypeId ? `AND lr.leave_type_id = ${annualLeaveTypeId}` : `AND (LOWER(lt.name) LIKE '%annual%' OR LOWER(lt.name) LIKE '%annual leave%')`}
      `, [yearStart, yearEnd]);

      // Get all approved annual leave requests for the previous year
      const [prevYearLeaveRequests] = await db.query(`
        SELECT 
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lr.is_half_day,
          lt.name AS leave_type_name
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE (lr.status = 'approved' OR lr.status = '1' OR lr.status = 1)
          AND lr.start_date >= ? 
          AND lr.start_date <= ?
          ${annualLeaveTypeId ? `AND lr.leave_type_id = ${annualLeaveTypeId}` : `AND (LOWER(lt.name) LIKE '%annual%' OR LOWER(lt.name) LIKE '%annual leave%')`}
      `, [prevYearStart, prevYearEnd]);

      // Helper function to calculate taken days
      const calculateTakenDays = (leaves) => {
        let takenDays = 0;
        leaves.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          // Calculate days between start and end (inclusive)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          // If half day, count as 0.5, otherwise count full days
          if (leave.is_half_day) {
            takenDays += 0.5;
          } else {
            takenDays += diffDays;
          }
        });
        return takenDays;
      };

      // Calculate taken days for each staff member
      const leaveReport = staff.map(employee => {
        // Current year calculations
        const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === employee.id);
        const takenDays = calculateTakenDays(employeeLeaves);
        
        // Previous year calculations
        const prevYearEmployeeLeaves = prevYearLeaveRequests.filter(lr => lr.employee_id === employee.id);
        const prevYearTakenDays = calculateTakenDays(prevYearEmployeeLeaves);
        
        const entitlement = 21; // Annual leave entitlement
        const balance = entitlement - takenDays;
        const balanceBefore = entitlement - prevYearTakenDays; // Previous year's balance
        const totalBalance = balanceBefore + entitlement - takenDays; // Total = Balance Before + Entitlement - Taken Days

        return {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.empl_no || '-',
          department: employee.department || '-',
          balanceBefore: Math.round(balanceBefore * 10) / 10, // Previous year balance
          entitlement: entitlement,
          takenDays: Math.round(takenDays * 10) / 10, // Round to 1 decimal place
          balance: Math.round(balance * 10) / 10, // Current year balance
          totalBalance: Math.round(totalBalance * 10) / 10 // Total balance (Balance Before + Entitlement - Taken Days)
        };
      });

      res.json(leaveReport);
    } catch (error) {
      console.error('Error fetching leave report:', error);
      res.status(500).json({ message: 'Failed to fetch leave report', error: error.message });
    }
  },

  // Get maternal leave report for all staff
  getMaternalLeaveReport: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Get all female staff only
      const [staff] = await db.query(`
        SELECT id, name, department, empl_no
        FROM staff
        WHERE is_active = TRUE AND gender = 'Female'
        ORDER BY name
      `);

      // Get maternal leave type ID
      const [leaveTypes] = await db.query(`
        SELECT id, name FROM leave_types 
        WHERE LOWER(name) LIKE '%maternal%' OR LOWER(name) LIKE '%maternity%' OR LOWER(name) LIKE '%maternal leave%'
      `);
      
      const maternalLeaveTypeId = leaveTypes.length > 0 ? leaveTypes[0].id : null;

      // Get all approved maternal leave requests for the current year
      const [leaveRequests] = await db.query(`
        SELECT 
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lr.is_half_day,
          lt.name AS leave_type_name
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE (lr.status = 'approved' OR lr.status = '1' OR lr.status = 1)
          AND lr.start_date >= ? 
          AND lr.start_date <= ?
          ${maternalLeaveTypeId ? `AND lr.leave_type_id = ${maternalLeaveTypeId}` : `AND (LOWER(lt.name) LIKE '%maternal%' OR LOWER(lt.name) LIKE '%maternity%' OR LOWER(lt.name) LIKE '%maternal leave%')`}
      `, [yearStart, yearEnd]);

      // Helper function to calculate taken days
      const calculateTakenDays = (leaves) => {
        let takenDays = 0;
        leaves.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          // Calculate days between start and end (inclusive)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          // If half day, count as 0.5, otherwise count full days
          if (leave.is_half_day) {
            takenDays += 0.5;
          } else {
            takenDays += diffDays;
          }
        });
        return takenDays;
      };

      // Calculate taken days for each staff member
      const leaveReport = staff.map(employee => {
        const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === employee.id);
        const takenDays = calculateTakenDays(employeeLeaves);
        
        const entitlement = 90; // Maternal leave entitlement
        const balance = entitlement - takenDays;

        return {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.empl_no || '-',
          department: employee.department || '-',
          entitlement: entitlement,
          takenDays: Math.round(takenDays * 10) / 10,
          balance: Math.round(balance * 10) / 10
        };
      });

      res.json(leaveReport);
    } catch (error) {
      console.error('Error fetching maternal leave report:', error);
      res.status(500).json({ message: 'Failed to fetch maternal leave report', error: error.message });
    }
  },

  // Get sick leave report for all staff
  getSickLeaveReport: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Get all staff
      const [staff] = await db.query(`
        SELECT id, name, department, empl_no
        FROM staff
        WHERE is_active = TRUE
        ORDER BY name
      `);

      // Get sick leave type ID
      const [leaveTypes] = await db.query(`
        SELECT id, name FROM leave_types 
        WHERE LOWER(name) LIKE '%sick%' OR LOWER(name) LIKE '%sick leave%'
      `);
      
      const sickLeaveTypeId = leaveTypes.length > 0 ? leaveTypes[0].id : null;

      // Get all approved sick leave requests for the current year
      const [leaveRequests] = await db.query(`
        SELECT 
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lr.is_half_day,
          lt.name AS leave_type_name
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE (lr.status = 'approved' OR lr.status = '1' OR lr.status = 1)
          AND lr.start_date >= ? 
          AND lr.start_date <= ?
          ${sickLeaveTypeId ? `AND lr.leave_type_id = ${sickLeaveTypeId}` : `AND (LOWER(lt.name) LIKE '%sick%' OR LOWER(lt.name) LIKE '%sick leave%')`}
      `, [yearStart, yearEnd]);

      // Helper function to calculate taken days
      const calculateTakenDays = (leaves) => {
        let takenDays = 0;
        leaves.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          // Calculate days between start and end (inclusive)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          // If half day, count as 0.5, otherwise count full days
          if (leave.is_half_day) {
            takenDays += 0.5;
          } else {
            takenDays += diffDays;
          }
        });
        return takenDays;
      };

      // Calculate taken days for each staff member
      const leaveReport = staff.map(employee => {
        const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === employee.id);
        const takenDays = calculateTakenDays(employeeLeaves);
        
        const entitlement = 45; // Sick leave entitlement
        const balance = entitlement - takenDays;

        return {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.empl_no || '-',
          department: employee.department || '-',
          entitlement: entitlement,
          takenDays: Math.round(takenDays * 10) / 10,
          balance: Math.round(balance * 10) / 10
        };
      });

      res.json(leaveReport);
    } catch (error) {
      console.error('Error fetching sick leave report:', error);
      res.status(500).json({ message: 'Failed to fetch sick leave report', error: error.message });
    }
  },

  // Get compassionate leave report for all staff
  getCompassionateLeaveReport: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Get all staff
      const [staff] = await db.query(`
        SELECT id, name, department, empl_no
        FROM staff
        WHERE is_active = TRUE
        ORDER BY name
      `);

      // Get compassionate leave type ID
      const [leaveTypes] = await db.query(`
        SELECT id, name FROM leave_types 
        WHERE LOWER(name) LIKE '%compassionate%' OR LOWER(name) LIKE '%compassionate leave%'
      `);
      
      const compassionateLeaveTypeId = leaveTypes.length > 0 ? leaveTypes[0].id : null;

      // Get all approved compassionate leave requests for the current year
      const [leaveRequests] = await db.query(`
        SELECT 
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lr.is_half_day,
          lt.name AS leave_type_name
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE (lr.status = 'approved' OR lr.status = '1' OR lr.status = 1)
          AND lr.start_date >= ? 
          AND lr.start_date <= ?
          ${compassionateLeaveTypeId ? `AND lr.leave_type_id = ${compassionateLeaveTypeId}` : `AND (LOWER(lt.name) LIKE '%compassionate%' OR LOWER(lt.name) LIKE '%compassionate leave%')`}
      `, [yearStart, yearEnd]);

      // Helper function to calculate taken days
      const calculateTakenDays = (leaves) => {
        let takenDays = 0;
        leaves.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          // Calculate days between start and end (inclusive)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          // If half day, count as 0.5, otherwise count full days
          if (leave.is_half_day) {
            takenDays += 0.5;
          } else {
            takenDays += diffDays;
          }
        });
        return takenDays;
      };

      // Calculate taken days for each staff member
      const leaveReport = staff.map(employee => {
        const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === employee.id);
        const takenDays = calculateTakenDays(employeeLeaves);
        
        const entitlement = 5; // Compassionate leave entitlement
        const balance = entitlement - takenDays;

        return {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.empl_no || '-',
          department: employee.department || '-',
          entitlement: entitlement,
          takenDays: Math.round(takenDays * 10) / 10,
          balance: Math.round(balance * 10) / 10
        };
      });

      res.json(leaveReport);
    } catch (error) {
      console.error('Error fetching compassionate leave report:', error);
      res.status(500).json({ message: 'Failed to fetch compassionate leave report', error: error.message });
    }
  },

  // Get paternal leave report for all staff
  getPaternalLeaveReport: async (req, res) => {
    try {
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      // Get all male staff only
      const [staff] = await db.query(`
        SELECT id, name, department, empl_no
        FROM staff
        WHERE is_active = TRUE AND gender = 'Male'
        ORDER BY name
      `);

      // Get paternal leave type ID
      const [leaveTypes] = await db.query(`
        SELECT id, name FROM leave_types 
        WHERE LOWER(name) LIKE '%paternal%' OR LOWER(name) LIKE '%paternity%' OR LOWER(name) LIKE '%paternal leave%'
      `);
      
      const paternalLeaveTypeId = leaveTypes.length > 0 ? leaveTypes[0].id : null;

      // Get all approved paternal leave requests for the current year
      const [leaveRequests] = await db.query(`
        SELECT 
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lr.is_half_day,
          lt.name AS leave_type_name
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE (lr.status = 'approved' OR lr.status = '1' OR lr.status = 1)
          AND lr.start_date >= ? 
          AND lr.start_date <= ?
          ${paternalLeaveTypeId ? `AND lr.leave_type_id = ${paternalLeaveTypeId}` : `AND (LOWER(lt.name) LIKE '%paternal%' OR LOWER(lt.name) LIKE '%paternity%' OR LOWER(lt.name) LIKE '%paternal leave%')`}
      `, [yearStart, yearEnd]);

      // Helper function to calculate taken days
      const calculateTakenDays = (leaves) => {
        let takenDays = 0;
        leaves.forEach(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          
          // Calculate days between start and end (inclusive)
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          // If half day, count as 0.5, otherwise count full days
          if (leave.is_half_day) {
            takenDays += 0.5;
          } else {
            takenDays += diffDays;
          }
        });
        return takenDays;
      };

      // Calculate taken days for each staff member
      const leaveReport = staff.map(employee => {
        const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === employee.id);
        const takenDays = calculateTakenDays(employeeLeaves);
        
        const entitlement = 14; // Paternal leave entitlement
        const balance = entitlement - takenDays;

        return {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.empl_no || '-',
          department: employee.department || '-',
          entitlement: entitlement,
          takenDays: Math.round(takenDays * 10) / 10,
          balance: Math.round(balance * 10) / 10
        };
      });

      res.json(leaveReport);
    } catch (error) {
      console.error('Error fetching paternal leave report:', error);
      res.status(500).json({ message: 'Failed to fetch paternal leave report', error: error.message });
    }
  },
};

module.exports = leaveRequestController; 