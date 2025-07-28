const db = require('../database/db');

const payrollController = {
  // Get available payment accounts (cash and bank accounts)
  getPaymentAccounts: async (req, res) => {
    try {
      const [accounts] = await db.query(`
        SELECT id, account_code, account_name, account_type
        FROM chart_of_accounts 
        WHERE account_type = 9 
        AND is_active = true
        ORDER BY account_code
      `);
      res.json({ success: true, data: accounts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // List payroll history (all or by staff)
  getPayrollHistory: async (req, res) => {
    try {
      const { staff_id } = req.query;
      let sql = `
        SELECT ph.*, s.name AS staff_name, s.role
        FROM payroll_history ph
        JOIN staff s ON ph.staff_id = s.id
      `;
      const params = [];
      if (staff_id) {
        sql += ' WHERE ph.staff_id = ?';
        params.push(staff_id);
      }
      sql += ' ORDER BY ph.pay_date DESC, ph.id DESC';
      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Add a payroll record
  addPayrollRecord: async (req, res) => {
    try {
      const { staff_id, pay_date, amount, notes } = req.body;
      if (!staff_id || !pay_date || !amount) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      await db.query(
        'INSERT INTO payroll_history (staff_id, pay_date, amount, notes) VALUES (?, ?, ?, ?)',
        [staff_id, pay_date, amount, notes || null]
      );
      res.json({ success: true, message: 'Payroll record added' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Helper functions for calculating deductions (same as frontend)
  calculatePAYE: (gross) => {
    if (gross <= 24000) return 0;
    if (gross <= 32333) return (gross - 24000) * 0.25;
    return (8333 * 0.25) + (gross - 32333) * 0.3;
  },

  calculateNSSF: (gross) => {
    return Math.min(gross * 0.06, 1080);
  },

  calculateNHIF: (gross) => {
    if (gross < 6000) return 150;
    if (gross < 8000) return 300;
    if (gross < 12000) return 400;
    return 500;
  },

  // Run payroll for all or selected staff
  runPayroll: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { pay_date, staff_ids, notes, overrides, payment_account_id } = req.body;
      if (!pay_date) {
        return res.status(400).json({ success: false, error: 'pay_date is required' });
      }
      if (!payment_account_id) {
        return res.status(400).json({ success: false, error: 'payment_account_id is required' });
      }

      // Fetch staff: all or selected
      let staffQuery = 'SELECT id, salary FROM staff';
      let params = [];
      if (Array.isArray(staff_ids) && staff_ids.length > 0) {
        staffQuery += ' WHERE id IN (?)';
        params.push(staff_ids);
      }
      const [staffList] = await connection.query(staffQuery, params);

      // Prevent duplicate payroll for same staff and pay_date
      const staffIds = staffList.map(s => s.id);
      if (staffIds.length === 0) {
        return res.status(400).json({ success: false, error: 'No staff found for payroll' });
      }
      const [existing] = await connection.query(
        `SELECT staff_id FROM payroll_history WHERE pay_date = ? AND staff_id IN (?)`,
        [pay_date, staffIds]
      );
      const alreadyPaidIds = new Set(existing.map(e => e.staff_id));

      // Prepare payroll records (skip already paid)
      const payrollRecords = staffList
        .filter(staff => !alreadyPaidIds.has(staff.id))
        .map(staff => {
          let amount = staff.salary;
          if (overrides && overrides[staff.id]) {
            amount = overrides[staff.id];
          }
          return [staff.id, pay_date, amount, notes || null];
        });

      if (payrollRecords.length === 0) {
        return res.status(400).json({ success: false, error: 'Payroll already processed for all selected staff for this date.' });
      }

      // Insert payroll records
      await connection.query(
        'INSERT INTO payroll_history (staff_id, pay_date, amount, notes) VALUES ?',
        [payrollRecords]
      );

      // Create journal entries for each staff member
      for (const record of payrollRecords) {
        const [staffId, payDate, grossAmount] = record;
        
        // Calculate deductions
        const paye = payrollController.calculatePAYE(grossAmount);
        const nssf = payrollController.calculateNSSF(grossAmount);
        const nhif = payrollController.calculateNHIF(grossAmount);
        const totalDeductions = paye + nssf + nhif;
        const netPay = grossAmount - totalDeductions;

        // Create journal entry
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-PAYROLL-${staffId}-${Date.now()}`,
            payDate,
            `PAYROLL-${staffId}`,
            `Payroll for staff ${staffId}`,
            netPay,
            netPay,
            1
          ]
        );
        const journalEntryId = journalResult.insertId;

        // Debit Net Wages (account_id 38)
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, 38, netPay, `Net wages for staff ${staffId}`]
        );

        // Credit Payment Account (user selected account)
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, payment_account_id, netPay, `Net wages payment for staff ${staffId}`]
        );

        // Credit PAYE (account_id 37) if there's tax
        if (paye > 0) {
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, 0, ?, ?)`,
            [journalEntryId, 37, paye, `PAYE for staff ${staffId}`]
          );
        }

        // Credit NSSF (account_id 39) if there's NSSF
        if (nssf > 0) {
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, 0, ?, ?)`,
            [journalEntryId, 39, nssf, `NSSF for staff ${staffId}`]
          );
        }

        // Credit NHIF (account_id 40) if there's NHIF
        if (nhif > 0) {
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, 0, ?, ?)`,
            [journalEntryId, 40, nhif, `NHIF for staff ${staffId}`]
          );
        }
      }

      await connection.commit();
      res.json({ success: true, message: 'Payroll processed', count: payrollRecords.length });
    } catch (error) {
      await connection.rollback();
      res.status(500).json({ success: false, error: error.message });
    } finally {
      connection.release();
    }
  },
};

module.exports = payrollController; 