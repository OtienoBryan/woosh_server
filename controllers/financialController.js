const db = require('../database/db');
const bcrypt = require('bcryptjs');

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
      const ACCOUNT_TYPE_MAP = {
        1: 'asset',
        2: 'liability',
        3: 'equity',
        4: 'fixed_asset',
        5: 'intangible_asset',
        6: 'inventory',
        7: 'receivable',
        8: 'prepayment',
        9: 'cash',
        10: 'payable',
        11: 'other_liability',
        12: 'credit_card',
        13: 'equity',
        14: 'revenue',
        15: 'cogs',
        16: 'expense',
        17: 'depreciation',
        18: 'retained_earnings',
        19: 'other_income'
        // Add more mappings as needed
      };
      // Map numeric account_type to string
      const mappedRows = rows.map(row => ({
        ...row,
        account_type: ACCOUNT_TYPE_MAP[row.account_type] || row.account_type
      }));
      res.json({ success: true, data: mappedRows });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
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
        SELECT * FROM suppliers 
        WHERE is_active = true 
        ORDER BY company_name
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
        WHERE status = 'delivered' AND YEAR(order_date) = YEAR(CURDATE())
      `);
      
      // Get total purchases (from purchase orders)
      const [purchasesResult] = await db.query(`
        SELECT COALESCE(SUM(total_amount), 0) as totalPurchases 
        FROM purchase_orders 
        WHERE status = 'received' AND YEAR(order_date) = YEAR(CURDATE())
      `);
      
      // Get total receivables (outstanding customer payments)
      const [receivablesResult] = await db.query(`
        SELECT COALESCE(SUM(debit - credit), 0) as totalReceivables
        FROM customer_ledger
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
  getAssetTypes,
  getAssetAccounts,
  addAsset,
  getAssets,
}; 