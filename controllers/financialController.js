const db = require('../database/db');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Chart of Accounts Controller
const chartOfAccountsController = {
  // Get all accounts
  getAllAccounts: async (req, res) => {
    try {
      let query = `SELECT * FROM chart_of_accounts WHERE is_active = 1`;
      const params = [];
      if (req.query.parent_account_id) {
        query += ' AND parent_account_id = ?';
        params.push(req.query.parent_account_id);
      }
      query += ' ORDER BY account_code';
      const [rows] = await db.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
  },

  // Get accounts by type
  getAccountsByType: async (req, res) => {
    try {
      const { account_type } = req.params;
      const [rows] = await db.query(`
        SELECT * FROM chart_of_accounts 
        WHERE account_type = ? AND is_active = 1 
        ORDER BY account_code
      `, [account_type]);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching accounts by type:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch accounts by type' });
    }
  },

  // Get account by ID
  getAccountById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM chart_of_accounts WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching account:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch account' });
    }
  },

  // Create new account
  createAccount: async (req, res) => {
    try {
      const { account_code, account_name, account_type, parent_account_id, description } = req.body;
      
      const [result] = await db.query(`
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, description)
        VALUES (?, ?, ?, ?, ?)
      `, [account_code, account_name, account_type, parent_account_id, description]);
      
      res.status(201).json({ 
        success: true, 
        data: { id: result.insertId, account_code, account_name, account_type },
        message: 'Account created successfully' 
      });
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ success: false, error: 'Failed to create account' });
    }
  },

  // Update account
  updateAccount: async (req, res) => {
    try {
      const { id } = req.params;
      const { account_code, account_name, account_type, parent_account_id, description } = req.body;
      
      const [result] = await db.query(`
        UPDATE chart_of_accounts 
        SET account_code = ?, account_name = ?, account_type = ?, parent_account_id = ?, description = ?
        WHERE id = ?
      `, [account_code, account_name, account_type, parent_account_id, description, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      
      res.json({ success: true, message: 'Account updated successfully' });
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ success: false, error: 'Failed to update account' });
    }
  },

  // Delete account (soft delete)
  deleteAccount: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('UPDATE chart_of_accounts SET is_active = false WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }
      
      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
  }
};

// Suppliers Controller
const suppliersController = {
  // Get all suppliers
  getAllSuppliers: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT s.*, 
          (
            SELECT running_balance 
            FROM supplier_ledger l 
            WHERE l.supplier_id = s.id 
            ORDER BY l.date DESC, l.id DESC 
            LIMIT 1
          ) AS balance
        FROM suppliers s
        WHERE s.is_active = true
        ORDER BY s.company_name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
    }
  },

  // Get supplier by ID
  getSupplierById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch supplier' });
    }
  },

  // Create new supplier
  createSupplier: async (req, res) => {
    try {
      const { 
        supplier_code, company_name, contact_person, email, phone, 
        address, tax_id, payment_terms, credit_limit 
      } = req.body;
      
      const [result] = await db.query(`
        INSERT INTO suppliers (supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit]);
      
      res.status(201).json({ 
        success: true, 
        data: { id: result.insertId, supplier_code, company_name },
        message: 'Supplier created successfully' 
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to create supplier' });
    }
  },

  // Update supplier
  updateSupplier: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        supplier_code, company_name, contact_person, email, phone, 
        address, tax_id, payment_terms, credit_limit 
      } = req.body;
      
      const [result] = await db.query(`
        UPDATE suppliers 
        SET supplier_code = ?, company_name = ?, contact_person = ?, email = ?, 
            phone = ?, address = ?, tax_id = ?, payment_terms = ?, credit_limit = ?
        WHERE id = ?
      `, [supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      
      res.json({ success: true, message: 'Supplier updated successfully' });
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to update supplier' });
    }
  },

  // Delete supplier (soft delete)
  deleteSupplier: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('UPDATE suppliers SET is_active = false WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Supplier not found' });
      }
      
      res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ success: false, error: 'Failed to delete supplier' });
    }
  }
};

// Customers Controller
const customersController = {
  // Get all customers
  getAllCustomers: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT * FROM customers 
        WHERE is_active = true 
        ORDER BY company_name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customers' });
    }
  },

  // Get customer by ID
  getCustomerById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch customer' });
    }
  },

  // Create new customer
  createCustomer: async (req, res) => {
    try {
      const { 
        customer_code, company_name, contact_person, email, phone, 
        address, tax_id, payment_terms, credit_limit 
      } = req.body;
      
      const [result] = await db.query(`
        INSERT INTO customers (customer_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [customer_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit]);
      
      res.status(201).json({ 
        success: true, 
        data: { id: result.insertId, customer_code, company_name },
        message: 'Customer created successfully' 
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ success: false, error: 'Failed to create customer' });
    }
  },

  // Update customer
  updateCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        customer_code, company_name, contact_person, email, phone, 
        address, tax_id, payment_terms, credit_limit 
      } = req.body;
      
      const [result] = await db.query(`
        UPDATE customers 
        SET customer_code = ?, company_name = ?, contact_person = ?, email = ?, 
            phone = ?, address = ?, tax_id = ?, payment_terms = ?, credit_limit = ?
        WHERE id = ?
      `, [customer_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, credit_limit, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      
      res.json({ success: true, message: 'Customer updated successfully' });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ success: false, error: 'Failed to update customer' });
    }
  },

  // Delete customer (soft delete)
  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('UPDATE customers SET is_active = false WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }
      
      res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ success: false, error: 'Failed to delete customer' });
    }
  }
};

// Products Controller
const productsController = {
  // Get all products
  getAllProducts: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT * FROM products 
        WHERE is_active = true 
        ORDER BY product_name
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
  },

  // Get product by ID
  getProductById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      
      res.json({ success: true, data: rows[0] });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch product' });
    }
  },

  // Create new product
  createProduct: async (req, res) => {
    try {
      const { 
        product_code, product_name, description, category, unit_of_measure,
        cost_price, selling_price, reorder_level, current_stock 
      } = req.body;
      
      const [result] = await db.query(`
        INSERT INTO products (product_code, product_name, description, category, unit_of_measure, cost_price, selling_price, reorder_level, current_stock)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [product_code, product_name, description, category, unit_of_measure, cost_price, selling_price, reorder_level, current_stock]);
      
      res.status(201).json({ 
        success: true, 
        data: { id: result.insertId, product_code, product_name },
        message: 'Product created successfully' 
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ success: false, error: 'Failed to create product' });
    }
  },

  // Update product
  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        product_code, product_name, description, category, unit_of_measure,
        cost_price, selling_price, reorder_level, current_stock 
      } = req.body;
      
      const [result] = await db.query(`
        UPDATE products 
        SET product_code = ?, product_name = ?, description = ?, category = ?, 
            unit_of_measure = ?, cost_price = ?, selling_price = ?, reorder_level = ?, current_stock = ?
        WHERE id = ?
      `, [product_code, product_name, description, category, unit_of_measure, cost_price, selling_price, reorder_level, current_stock, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      
      res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ success: false, error: 'Failed to update product' });
    }
  },

  // Delete product (soft delete)
  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [result] = await db.query('UPDATE products SET is_active = false WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
  },

  // Get low stock products
  getLowStockProducts: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT * FROM products 
        WHERE current_stock <= reorder_level AND is_active = true
        ORDER BY current_stock ASC
      `);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch low stock products' });
    }
  }
};

// Dashboard Controller
const dashboardController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      // Get total sales (from sales orders)
      const [salesResult] = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as totalSales 
        FROM sales_orders 
        WHERE status IN ('delivered', 'confirmed', 'shipped')
      `);
      
      // Get total purchases (from purchase orders)
      const [purchasesResult] = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as totalPurchases 
        FROM purchase_orders 
        WHERE status IN ('received', 'sent')
        AND DATE(order_date) = CURDATE()
      `);
      
      // Get total receivables (outstanding client payments)
      const [receivablesResult] = await db.query(`
        SELECT COALESCE(SUM(debit - credit), 0) as totalReceivables
        FROM client_ledger
      `);
      
      // Get total payables (outstanding supplier payments)
      const [payablesResult] = await db.query(`
        SELECT COALESCE(SUM(credit - debit), 0) as totalPayables
        FROM supplier_ledger
      `);
      
      // Get low stock items count
      const [lowStockResult] = await db.query(`
        SELECT COUNT(*) as lowStockItems
        FROM products 
        WHERE current_stock <= reorder_level AND is_active = true
      `);
      
      // Get pending orders count
      const [pendingOrdersResult] = await db.query(`
        SELECT COUNT(*) as pendingOrders
        FROM sales_orders 
        WHERE status IN ('draft', 'confirmed', 'shipped')
      `);
      
      // Get total assets (sum of purchase_value from assets)
      const [assetsResult] = await db.query(`
        SELECT COALESCE(SUM(purchase_value), 0) as totalAssets FROM assets
      `);
      
      const stats = {
        totalSales: salesResult[0].totalSales,
        totalPurchases: purchasesResult[0].totalPurchases,
        totalReceivables: receivablesResult[0].totalReceivables,
        totalPayables: payablesResult[0].totalPayables,
        lowStockItems: lowStockResult[0].lowStockItems,
        pendingOrders: pendingOrdersResult[0].pendingOrders,
        totalAssets: assetsResult[0].totalAssets
      };
      
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
    }
  }
};

// Post an expense
const postExpense = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { expense_account_id, payment_account_id, amount, date, description, reference, is_paid } = req.body;
    if (!expense_account_id || !amount || !date) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // If not paid, use Accrued Expenses as the credit account
    let creditAccountId = payment_account_id;
    if (!is_paid) {
      // Find Accrued Expenses account (account_code '2100')
      const [accruedRows] = await connection.query("SELECT id FROM chart_of_accounts WHERE account_code = '210003' LIMIT 1");
      if (accruedRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Accrued Expenses account not found' });
      }
      creditAccountId = accruedRows[0].id;
    }

    // Create journal entry
    const [journalResult] = await connection.query(
      `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'posted', 1)`,
      [
        `JE-EXP-${expense_account_id}-${Date.now()}`,
        date,
        reference || '',
        description || 'Expense posted',
        amount,
        amount
      ]
    );
    const journalEntryId = journalResult.insertId;

    // Debit expense account
    await connection.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES (?, ?, ?, 0, ?)`,
      [journalEntryId, expense_account_id, amount, description || 'Expense']
    );
    // Credit payment or accrued account
    await connection.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES (?, ?, 0, ?, ?)`,
      [journalEntryId, creditAccountId, amount, description || (is_paid ? 'Expense payment' : 'Accrued expense')]
    );

    // Update account_ledger for credit account (credit, reduces cash/bank or increases accrued)
    if (is_paid) {
      // Update payment account ledger
      const [lastPaymentLedger] = await connection.query(
        'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [payment_account_id]
      );
      const prevPaymentBalance = lastPaymentLedger.length > 0 ? parseFloat(lastPaymentLedger[0].running_balance) : 0;
      const newPaymentBalance = prevPaymentBalance - amount;
      await connection.query(
        `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
        [
          payment_account_id,
          date,
          description || 'Expense payment',
          'expense',
          journalEntryId,
          0,
          amount,
          newPaymentBalance
        ]
      );
    } else {
      // Update accrued expenses ledger
      const [lastAccruedLedger] = await connection.query(
        'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [creditAccountId]
      );
      const prevAccruedBalance = lastAccruedLedger.length > 0 ? parseFloat(lastAccruedLedger[0].running_balance) : 0;
      const newAccruedBalance = prevAccruedBalance + amount;
      await connection.query(
        `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
        [
          creditAccountId,
          date,
          description || 'Accrued expense',
          'expense',
          journalEntryId,
          0,
          amount,
          newAccruedBalance
        ]
      );
    }

    // Update account_ledger for expense account (debit, increases expense)
    const [lastExpenseLedger] = await connection.query(
      'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
      [expense_account_id]
    );
    const prevExpenseBalance = lastExpenseLedger.length > 0 ? parseFloat(lastExpenseLedger[0].running_balance) : 0;
    const newExpenseBalance = prevExpenseBalance + amount;
    await connection.query(
      `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        expense_account_id,
        date,
        description || 'Expense',
        'expense',
        journalEntryId,
        amount,
        0,
        newExpenseBalance
      ]
    );

    await connection.commit();
    res.json({ success: true, message: 'Expense posted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error posting expense:', error);
    res.status(500).json({ success: false, error: 'Failed to post expense' });
  } finally {
    connection.release();
  }
};

// Endpoint to post asset depreciation
const postDepreciation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { asset_id, amount, date, description, depreciation_account_id } = req.body;
    if (!asset_id || !amount || !date || !depreciation_account_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Get asset info and related accounts
    const [assetRows] = await connection.query('SELECT * FROM assets WHERE id = ?', [asset_id]);
    if (assetRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    const asset = assetRows[0];

    // Use selected Depreciation Expense account
    const depreciationExpenseId = depreciation_account_id;

    // Find Accumulated Depreciation account (e.g., account_code '1500')
    const [accumDepRows] = await connection.query("SELECT id FROM chart_of_accounts WHERE account_code = '520007' LIMIT 1");
    if (accumDepRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Accumulated Depreciation account not found' });
    }
    const accumulatedDepreciationId = accumDepRows[0].id;

    // Create journal entry
    const [journalResult] = await connection.query(
      `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'posted', 1)`,
      [
        `JE-DEP-${asset_id}-${Date.now()}`,
        date,
        `Depreciation for asset ${asset_id}`,
        description || `Depreciation for asset ${asset_id}`,
        amount,
        amount
      ]
    );
    const journalEntryId = journalResult.insertId;

    // Debit Depreciation Expense
    await connection.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES (?, ?, ?, 0, ?)`,
      [journalEntryId, depreciationExpenseId, amount, description || 'Depreciation']
    );
    // Credit Accumulated Depreciation
    await connection.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES (?, ?, 0, ?, ?)`,
      [journalEntryId, accumulatedDepreciationId, amount, description || 'Depreciation']
    );

    await connection.commit();
    res.json({ success: true, message: 'Depreciation posted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error posting depreciation:', error);
    res.status(500).json({ success: false, error: 'Failed to post depreciation' });
  } finally {
    connection.release();
  }
};

// Add equity entry
const addEquityEntry = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { account_id, amount, date, description } = req.body;
    if (!account_id || !amount || !date) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    // Find a cash/bank account to debit (first active cash account)
    const [cashRows] = await connection.query(
      "SELECT id FROM chart_of_accounts WHERE (account_code = '1000' OR account_name LIKE '%Cash%' OR account_name LIKE '%Bank%') AND is_active = 1 LIMIT 1"
    );
    if (cashRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'No cash/bank account found' });
    }
    const cashAccountId = cashRows[0].id;
    // Create journal entry
    const [journalResult] = await connection.query(
      `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'posted', 1)`,
      [
        `JE-EQ-${account_id}-${Date.now()}`,
        date,
        '',
        description || 'Equity entry',
        amount,
        amount
      ]
    );
    const journalEntryId = journalResult.insertId;
    // Debit cash/bank
    // await connection.query(
    //   `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
    //    VALUES (?, ?, ?, 0, ?)`,
    //   [journalEntryId, cashAccountId, amount, description || 'Equity funding']
    // );
    // Credit equity account
    await connection.query(
      `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
       VALUES (?, ?, 0, ?, ?)`,
      [journalEntryId, account_id, amount, description || 'Equity funding']
    );
    await connection.commit();
    res.json({ success: true, message: 'Equity entry added successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding equity entry:', error);
    res.status(500).json({ success: false, error: 'Failed to add equity entry' });
  } finally {
    connection.release();
  }
};

// List all equity journal entries
const listEquityEntries = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT jel.id, je.entry_date, jel.credit_amount AS amount, jel.description, coa.account_name, coa.account_code
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 'equity' AND jel.credit_amount > 0
      ORDER BY je.entry_date DESC, jel.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching equity entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch equity entries' });
  }
};

// ASSET MANAGEMENT
const getAssetTypes = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM asset_types ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch asset types' });
  }
};

// List asset accounts from chart_of_accounts
const getAssetAccounts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT coa.id, coa.account_code, coa.account_name
      FROM chart_of_accounts coa
      WHERE coa.account_type IN(4, 5) AND coa.is_active = 1
      ORDER BY coa.account_code
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch asset accounts' });
  }
};

// List depreciation accounts from chart_of_accounts
const getDepreciationAccounts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT coa.id, coa.account_code, coa.account_name
      FROM chart_of_accounts coa
      WHERE coa.account_type = 17
      AND coa.is_active = 1
      ORDER BY coa.account_code
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch depreciation accounts' });
  }
};

// Get depreciation history
const getDepreciationHistory = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        jel.id,
        jel.journal_entry_id,
        a.id as asset_id,
        a.name as asset_name,
        jel.debit_amount as amount,
        je.entry_date as date,
        jel.description,
        coa.account_name as depreciation_account_name,
        je.created_at
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      LEFT JOIN assets a ON je.reference LIKE CONCAT('%asset ', a.id, '%')
      WHERE coa.account_type = 17
      AND jel.debit_amount > 0
      ORDER BY je.entry_date DESC, jel.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching depreciation history:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch depreciation history' });
  }
};

const addAsset = async (req, res) => {
  try {
    const { account_id, name, purchase_date, purchase_value, description } = req.body;
    if (!account_id || !name || !purchase_date || !purchase_value) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    await db.query(
      'INSERT INTO assets (account_id, name, purchase_date, purchase_value, description) VALUES (?, ?, ?, ?, ?)',
      [account_id, name, purchase_date, purchase_value, description || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add asset' });
  }
};

const getAssets = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, coa.account_code, coa.account_name FROM assets a JOIN chart_of_accounts coa ON a.account_id = coa.id ORDER BY a.purchase_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch assets' });
  }
};

// Add bulk equity entries
const addBulkEquityEntries = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { entries } = req.body;
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, error: 'No entries provided' });
    }

    const results = [];

    for (const entry of entries) {
      const { account_id, amount, description, entry_date, reference } = entry;
      
      if (!account_id || !amount || !entry_date) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: 'Missing required fields in entry' });
      }

      // Verify the account exists and is an equity account
      const [accountRows] = await connection.query(
        'SELECT * FROM chart_of_accounts WHERE id = ? AND account_type = ? AND is_active = 1',
        [account_id, 13]
      );
      
      if (accountRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: `Invalid equity account ID: ${account_id}` });
      }

      // Create journal entry
      const [journalResult] = await connection.query(
        `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'posted', 1)`,
        [
          `JE-EQ-${account_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          entry_date,
          reference || '',
          description || 'Equity entry',
          amount,
          amount
        ]
      );
      
      const journalEntryId = journalResult.insertId;

      // Credit equity account
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, 0, ?, ?)`,
        [journalEntryId, account_id, amount, description || 'Equity entry']
      );

      results.push({
        account_id,
        amount,
        description,
        entry_date,
        journal_entry_id: journalEntryId
      });
    }

    await connection.commit();
    res.json({ 
      success: true, 
      message: `${results.length} equity entries posted successfully`,
      data: results
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding bulk equity entries:', error);
    res.status(500).json({ success: false, error: 'Failed to add equity entries' });
  } finally {
    connection.release();
  }
};

// Get cash and equivalents accounts
const getCashAndEquivalents = async (req, res) => {
  try {
    const { as_of_date } = req.query;
    const dateFilter = as_of_date ? 'AND je.entry_date <= ?' : 'AND je.entry_date <= CURDATE()';
    const params = as_of_date ? [as_of_date] : [];

    // Get all cash and equivalents accounts with balances
    const [accountsResult] = await db.query(`
      SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.description,
        COALESCE(SUM(
          CASE 
            WHEN coa.account_type = 9 THEN jel.debit_amount - jel.credit_amount
            ELSE jel.credit_amount - jel.debit_amount
          END
        ), 0) as balance
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_type = 9 AND coa.is_active = true ${dateFilter}
      GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.description
      ORDER BY coa.account_code
    `, params);

    // Calculate summary statistics
    const accounts = accountsResult.map(account => ({
      ...account,
      balance: typeof account.balance === 'string' ? parseFloat(account.balance) : Number(account.balance) || 0
    }));

    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const positiveAccounts = accounts.filter(account => account.balance > 0).length;
    const negativeAccounts = accounts.filter(account => account.balance < 0).length;
    const zeroBalanceAccounts = accounts.filter(account => Math.abs(account.balance) === 0).length;

    const summary = {
      total_balance: totalBalance,
      positive_accounts: positiveAccounts,
      negative_accounts: negativeAccounts,
      zero_balance_accounts: zeroBalanceAccounts
    };

    res.json({ 
      success: true, 
      data: {
        accounts,
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching cash and equivalents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cash and equivalents' });
  }
};

// Set opening balance for cash and equivalents accounts
const setOpeningBalance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { account_id, amount, opening_date, description } = req.body;
    
    if (!account_id || amount === undefined || amount === null || !opening_date) {
      return res.status(400).json({ success: false, error: 'Missing required fields: account_id, amount, opening_date' });
    }

    // Verify the account exists and is a cash/equivalents account
    const [accountRows] = await connection.query(
      'SELECT * FROM chart_of_accounts WHERE id = ? AND account_type = 9 AND is_active = 1',
      [account_id]
    );
    
    if (accountRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Invalid cash/equivalents account ID' });
    }

    const account = accountRows[0];

    // Check if opening balance already exists for this account and date
    const [existingBalance] = await connection.query(
      `SELECT jel.* FROM journal_entry_lines jel
       JOIN journal_entries je ON jel.journal_entry_id = je.id
       WHERE jel.account_id = ? AND je.entry_date = ? AND je.reference LIKE '%Opening Balance%'`,
      [account_id, opening_date]
    );

    if (existingBalance.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Opening balance already exists for this account and date' });
    }

    // Create journal entry for opening balance
    const [journalResult] = await connection.query(
      `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'posted', 1)`,
      [
        `JE-OB-${account_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opening_date,
        'Opening Balance',
        description || `Opening balance for ${account.account_name}`,
        Math.abs(amount),
        Math.abs(amount)
      ]
    );
    
    const journalEntryId = journalResult.insertId;

    // Create journal entry line - debit cash account if positive, credit if negative
    if (amount > 0) {
      // Debit cash account
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, ?, 0, ?)`,
        [journalEntryId, account_id, amount, description || 'Opening balance']
      );

      // Credit opening balance equity account (or contra account)
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, 0, ?, ?)`,
        [journalEntryId, 1, amount, description || 'Opening balance'] // Using account ID 1 as contra account
      );
    } else {
      // Credit cash account
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, 0, ?, ?)`,
        [journalEntryId, account_id, Math.abs(amount), description || 'Opening balance']
      );

      // Debit opening balance equity account (or contra account)
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, ?, 0, ?)`,
        [journalEntryId, 1, Math.abs(amount), description || 'Opening balance'] // Using account ID 1 as contra account
      );
    }

    await connection.commit();
    res.json({ 
      success: true, 
      message: 'Opening balance set successfully',
      data: {
        account_id,
        amount,
        opening_date,
        journal_entry_id: journalEntryId
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error setting opening balance:', error);
    res.status(500).json({ success: false, error: 'Failed to set opening balance' });
  } finally {
    connection.release();
  }
};

// Get all cash and equivalents accounts from chart of accounts
const getAllCashAccounts = async (req, res) => {
  try {
    const [accounts] = await db.query(`
      SELECT 
        id,
        account_code,
        account_name,
        account_type,
        description,
        is_active,
        created_at,
        updated_at
      FROM chart_of_accounts 
      WHERE account_type = 9 
      ORDER BY account_code
    `);

    res.json({ 
      success: true, 
      data: accounts
    });
  } catch (error) {
    console.error('Error fetching cash accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cash accounts' });
  }
};

// Get detailed ledger entries for a specific cash account
const getCashAccountLedger = async (req, res) => {
  try {
    const { account_id } = req.params;
    const { start_date, end_date } = req.query;
    
    if (!account_id) {
      return res.status(400).json({ success: false, error: 'account_id is required' });
    }

    // Verify the account exists and is a cash account
    const [accountRows] = await db.query(
      'SELECT * FROM chart_of_accounts WHERE id = ? AND account_type = 9 AND is_active = 1',
      [account_id]
    );
    
    if (accountRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid cash account ID' });
    }

    // Build date filter conditions
    let dateFilter = '';
    const params = [account_id];
    
    if (start_date && end_date) {
      dateFilter = 'AND je.entry_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'AND je.entry_date >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = 'AND je.entry_date <= ?';
      params.push(end_date);
    }

    // Get all journal entry lines for this account with running balance calculation
    const [rows] = await db.query(`
      SELECT 
        jel.id,
        jel.journal_entry_id,
        je.entry_date,
        je.entry_number,
        je.reference,
        jel.description,
        jel.debit_amount,
        jel.credit_amount,
        @running_balance := @running_balance + (jel.debit_amount - jel.credit_amount) as running_balance,
        je.created_at
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      CROSS JOIN (SELECT @running_balance := 0) as vars
      WHERE jel.account_id = ? ${dateFilter}
      ORDER BY je.entry_date ASC, jel.id ASC
    `, params);

    // Format the data for frontend
    const entries = rows.map(row => ({
      id: row.id,
      journal_entry_id: row.journal_entry_id,
      entry_date: row.entry_date,
      reference: row.reference,
      description: row.description,
      debit_amount: parseFloat(row.debit_amount) || 0,
      credit_amount: parseFloat(row.credit_amount) || 0,
      running_balance: parseFloat(row.running_balance) || 0,
      entry_number: row.entry_number,
      created_at: row.created_at
    }));

    res.json({ 
      success: true, 
      data: entries
    });
  } catch (error) {
    console.error('Error fetching cash account ledger:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch account ledger' });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM Category ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};

// Add a new category
const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    const [result] = await db.query('INSERT INTO Category (name) VALUES (?)', [name]);
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add category' });
  }
};

// Update a category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    await db.query('UPDATE Category SET name = ? WHERE id = ?', [name, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM Category WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
};

// Get all price options for a category
const getCategoryPriceOptions = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM CategoryPriceOption WHERE category_id = ? ORDER BY label', [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch price options' });
  }
};

// Add a price option to a category
const addCategoryPriceOption = async (req, res) => {
  try {
    const { id } = req.params; // category_id
    const { label, value } = req.body;
    if (!label || value === undefined) return res.status(400).json({ success: false, error: 'Label and value are required' });
    const [result] = await db.query('INSERT INTO CategoryPriceOption (category_id, label, value) VALUES (?, ?, ?)', [id, label, value]);
    res.status(201).json({ success: true, data: { id: result.insertId, category_id: id, label, value } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to add price option' });
  }
};

// Update a price option
const updateCategoryPriceOption = async (req, res) => {
  try {
    const { id } = req.params; // price option id
    const { label, value } = req.body;
    if (!label || value === undefined) return res.status(400).json({ success: false, error: 'Label and value are required' });
    await db.query('UPDATE CategoryPriceOption SET label = ?, value = ? WHERE id = ?', [label, value, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update price option' });
  }
};

// Delete a price option
const deleteCategoryPriceOption = async (req, res) => {
  try {
    const { id } = req.params; // price option id
    await db.query('DELETE FROM CategoryPriceOption WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete price option' });
  }
};

// Multer setup for product images (serverless compatible)
const uploadProductImageMulter = multer({ storage: multer.memoryStorage() });

// Upload product image controller (Cloudinary)
const uploadProductImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const productId = req.params.id;
  try {
    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'products',
      public_id: `product_${productId}_${Date.now()}`,
      resource_type: 'image',
    });
    const imageUrl = result.secure_url;
    await db.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, productId]);
    res.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
};

// Create product with optional image upload
const createProduct = async (req, res) => {
  try {
    const { product_name, product_code, category_id, cost_price } = req.body;
    if (!product_name || !product_code || !category_id || !cost_price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    let imageUrl = null;
    if (req.file) {
      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'products',
        public_id: `product_${product_code}_${Date.now()}`,
        resource_type: 'image',
      });
      imageUrl = result.secure_url;
    }
    // Get category name for denormalized field
    let categoryName = '';
    const [catRows] = await db.query('SELECT name FROM Category WHERE id = ?', [category_id]);
    if (catRows.length > 0) categoryName = catRows[0].name;
    const [result] = await db.query(
      `INSERT INTO products (product_code, product_name, category, category_id, cost_price, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product_code, product_name, categoryName, category_id, cost_price, imageUrl]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};

// Get all sales reps
const getSalesReps = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, phoneNumber FROM SalesRep ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch sales reps' });
  }
};

// Get all assets
const getAllAssets = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM assets ORDER BY purchase_date DESC, id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assets' });
  }
};

// Get all assets with depreciation and current value
const getAllAssetsWithDepreciation = async (req, res) => {
  try {
    // Get all assets with their account info
    const [assets] = await db.query(`
      SELECT a.*, coa.account_name AS category
      FROM assets a
      LEFT JOIN chart_of_accounts coa ON a.account_id = coa.id
      ORDER BY a.purchase_date DESC, a.id DESC
    `);
    if (!assets.length) return res.json({ success: true, data: [] });

    // Get total depreciation per asset
    const [depreciationRows] = await db.query(`
      SELECT 
        a.id as asset_id,
        COALESCE(SUM(jel.debit_amount), 0) as total_depreciation
      FROM assets a
      LEFT JOIN journal_entries je ON je.reference LIKE CONCAT('%asset ', a.id, '%')
      LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 17 AND jel.debit_amount > 0
      GROUP BY a.id
    `);
    const depreciationMap = {};
    for (const row of depreciationRows) {
      depreciationMap[row.asset_id] = parseFloat(row.total_depreciation || 0);
    }

    // Attach depreciation and current value to each asset
    const result = assets.map(asset => {
      const total_depreciation = depreciationMap[asset.id] || 0;
      const current_value = parseFloat(asset.purchase_value) - total_depreciation;
      return { ...asset, total_depreciation, current_value };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching assets with depreciation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assets with depreciation' });
  }
};

// Get total current value of all assets
const getAssetsTotalValue = async (req, res) => {
  try {
    // Get all assets
    const [assets] = await db.query('SELECT * FROM assets');
    if (!assets.length) return res.json({ success: true, total_value: 0 });

    // Get total depreciation per asset
    const [depreciationRows] = await db.query(`
      SELECT 
        a.id as asset_id,
        COALESCE(SUM(jel.debit_amount), 0) as total_depreciation
      FROM assets a
      LEFT JOIN journal_entries je ON je.reference LIKE CONCAT('%asset ', a.id, '%')
      LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
      LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE coa.account_type = 17 AND jel.debit_amount > 0
      GROUP BY a.id
    `);
    const depreciationMap = {};
    for (const row of depreciationRows) {
      depreciationMap[row.asset_id] = parseFloat(row.total_depreciation || 0);
    }

    // Sum current value for all assets
    let total_value = 0;
    for (const asset of assets) {
      const total_depreciation = depreciationMap[asset.id] || 0;
      const current_value = parseFloat(asset.purchase_value) - total_depreciation;
      total_value += current_value;
    }
    res.json({ success: true, total_value });
  } catch (error) {
    console.error('Error fetching total asset value:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch total asset value' });
  }
};

// Get all expenses (journal_entry_lines joined with chart_of_accounts where account_type = 16)
const getAllExpenses = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT jel.*, coa.account_name, coa.account_code, je.entry_date
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE coa.account_type = 16
    `;
    const params = [];
    if (start_date) {
      sql += ' AND je.entry_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND je.entry_date <= ?';
      params.push(end_date);
    }
    sql += ' ORDER BY jel.id DESC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
  }
};

// Create journal entry
const createJournalEntry = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const { entry_date, reference, description, lines } = req.body;
    
    if (!entry_date || !reference || !description || !lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ success: false, error: 'Missing required fields or invalid lines' });
    }
    
    // Validate that debits equal credits
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ 
        success: false, 
        error: `Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)})` 
      });
    }
    
    // Validate each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.account_id) {
        return res.status(400).json({ success: false, error: `Line ${i + 1}: Account is required` });
      }
      if (line.debit_amount === 0 && line.credit_amount === 0) {
        return res.status(400).json({ success: false, error: `Line ${i + 1}: Either debit or credit amount must be greater than 0` });
      }
      if (line.debit_amount > 0 && line.credit_amount > 0) {
        return res.status(400).json({ success: false, error: `Line ${i + 1}: Cannot have both debit and credit amounts` });
      }
    }
    
    // Generate entry number
    const entryNumber = `JE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create journal entry
    const [journalResult] = await connection.query(
      `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
      [entryNumber, entry_date, reference, description, totalDebit, totalCredit, 1]
    );
    
    const journalEntryId = journalResult.insertId;
    
    // Create journal entry lines
    for (const line of lines) {
      await connection.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
         VALUES (?, ?, ?, ?, ?)`,
        [journalEntryId, line.account_id, line.debit_amount || 0, line.credit_amount || 0, line.description || '']
      );
    }
    
    await connection.commit();
    
    res.status(201).json({ 
      success: true, 
      message: 'Journal entry created successfully',
      data: {
        id: journalEntryId,
        entry_number: entryNumber,
        entry_date,
        reference,
        description,
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines_count: lines.length
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error creating journal entry:', error);
    res.status(500).json({ success: false, error: 'Failed to create journal entry' });
  } finally {
    connection.release();
  }
};

const getProductsSaleReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND so.order_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT 
        p.id,
        p.product_name,
        p.product_code,
        c.name as category_name,
        COALESCE(SUM(soi.quantity), 0) as total_quantity,
        COALESCE(SUM(soi.quantity * soi.unit_price), 0) as total_amount,
        COUNT(DISTINCT so.id) as total_orders,
        CASE 
          WHEN SUM(soi.quantity) > 0 
          THEN SUM(soi.quantity * soi.unit_price) / SUM(soi.quantity)
          ELSE 0 
        END as average_price
      FROM products p
      LEFT JOIN Category c ON p.category_id = c.id
      LEFT JOIN sales_order_items soi ON p.id = soi.product_id
      LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE so.my_status = 1 ${dateFilter}
      GROUP BY p.id, p.product_name, p.product_code, c.name
      HAVING total_quantity > 0
      ORDER BY total_amount DESC
    `;

    console.log('Executing products sale report query:', query);
    console.log('Query params:', params);

    const [rows] = await db.query(query, params);
    console.log('Products sale report result:', rows.length, 'products');

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching products sale report:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products sale report' });
  }
};

module.exports = {
  chartOfAccountsController,
  suppliersController,
  customersController,
  productsController,
  dashboardController,
  postExpense,
  postDepreciation,
  addEquityEntry,
  listEquityEntries,
  addBulkEquityEntries,
  getAssetTypes,
  getAssetAccounts,
  getDepreciationAccounts,
  getDepreciationHistory,
  addAsset,
  getAssets,
  getAllAssets,
  getAllAssetsWithDepreciation,
  getCashAndEquivalents,
  setOpeningBalance,
  getAllCashAccounts,
  getCashAccountLedger,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoryPriceOptions,
  addCategoryPriceOption,
  updateCategoryPriceOption,
  deleteCategoryPriceOption,
  uploadProductImage,
  uploadProductImageMulter,
  createProduct,
  getSalesReps,
  getAssetsTotalValue,
  getAllExpenses,
  createJournalEntry,
  getProductsSaleReport,
}; 