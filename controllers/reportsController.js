const db = require('../database/db');

const reportsController = {
  // Get Profit and Loss Report
  getProfitLossReport: async (req, res) => {
    try {
      const { period, start_date, end_date } = req.query;
      
      let conditions = [];
      let params = [];
      
      // Determine date range based on period
      if (period === 'custom' && start_date && end_date) {
        conditions.push('je.entry_date BETWEEN ? AND ?');
        params = [start_date, end_date];
      } else {
        switch (period) {
          case 'current_month':
            conditions.push('YEAR(je.entry_date) = YEAR(CURDATE()) AND MONTH(je.entry_date) = MONTH(CURDATE())');
            break;
          case 'last_month':
            conditions.push('YEAR(je.entry_date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(je.entry_date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))');
            break;
          case 'current_quarter':
            conditions.push('YEAR(je.entry_date) = YEAR(CURDATE()) AND QUARTER(je.entry_date) = QUARTER(CURDATE())');
            break;
          case 'current_year':
            conditions.push('YEAR(je.entry_date) = YEAR(CURDATE())');
            break;
          default:
            conditions.push('YEAR(je.entry_date) = YEAR(CURDATE()) AND MONTH(je.entry_date) = MONTH(CURDATE())');
        }
      }

      // Revenue query (join account_category)
      let revenueConditions = [...conditions];
      const revenueWhere = revenueConditions.length ? 'WHERE ' + revenueConditions.join(' AND ') : '';

      const [revenueResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as balance
        FROM chart_of_accounts coa
        JOIN account_category ac ON coa.parent_account_id = ac.id AND ac.name = 'Revenue'
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        ${revenueWhere}
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Expense query (join account_category)
      let expenseConditions = [...conditions];
      const expenseWhere = expenseConditions.length ? 'WHERE ' + expenseConditions.join(' AND ') : '';

      const [expenseResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
        FROM chart_of_accounts coa
        JOIN account_category ac ON coa.parent_account_id = ac.id AND ac.name = 'Expenses'
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        ${expenseWhere}
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Map revenue and expense accounts by code
      const salesRevenue = parseFloat(revenueResult.find(r => r.account_code === '400001')?.balance || 0);
      const otherIncome = parseFloat(revenueResult.find(r => r.account_code === '400006')?.balance || 0);
      const totalRevenue = salesRevenue + otherIncome;

      const costOfGoodsSold = parseFloat(expenseResult.find(e => e.account_code === '500000')?.balance || 0);

      // Get all operating expenses except COGS
      const operatingExpenseAccounts = expenseResult.filter(e => e.account_code !== '500000');
      const operatingExpensesBreakdown = operatingExpenseAccounts.map(e => ({
        account_code: e.account_code,
        account_name: e.account_name,
        balance: parseFloat(e.balance || 0)
      }));
      const totalOperatingExpenses = operatingExpensesBreakdown.reduce((sum, e) => sum + e.balance, 0);

      const totalExpenses = costOfGoodsSold + totalOperatingExpenses;
      const grossProfit = totalRevenue - costOfGoodsSold;
      const netProfit = grossProfit - totalOperatingExpenses;
      const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
      const netMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;

      const reportData = {
        period: period || 'current_month',
        revenue: {
          sales_revenue: salesRevenue,
          other_income: otherIncome,
          total_revenue: totalRevenue
        },
        expenses: {
          cost_of_goods_sold: costOfGoodsSold,
          operating_expenses_breakdown: operatingExpensesBreakdown,
          total_operating_expenses: totalOperatingExpenses,
          total_expenses: totalExpenses
        },
        gross_profit: grossProfit,
        net_profit: netProfit,
        gross_margin: grossMargin,
        net_margin: netMargin
      };

      res.json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error generating profit and loss report:', error);
      res.status(500).json({ success: false, error: 'Failed to generate profit and loss report' });
    }
  },

  // Get Balance Sheet Report
  getBalanceSheetReport: async (req, res) => {
    try {
      const { as_of_date } = req.query;
      const dateFilter = as_of_date ? 'AND je.entry_date <= ?' : 'AND je.entry_date <= CURDATE()';
      const params = as_of_date ? [as_of_date] : [];

      // Get all account balances, joining to parent account for category
      const [accountsResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          ac.id AS category_id,
          ac.name AS category_name,
          coa.account_type,
          COALESCE(SUM(
            CASE 
              WHEN coa.account_type IN ('14', '17') THEN jel.debit_amount - jel.credit_amount
              ELSE jel.credit_amount - jel.debit_amount
            END
          ), 0) as balance
        FROM chart_of_accounts coa
        LEFT JOIN account_category ac ON coa.parent_account_id = ac.id
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.is_active = true ${dateFilter}
        GROUP BY coa.id, coa.account_code, coa.account_name, ac.id, ac.name, coa.account_type
        ORDER BY coa.account_code
      `, params);

      // Fetch unpaid assets from the assets table
      const [unpaidAssetsResult] = await db.query(`
        SELECT COALESCE(SUM(purchase_value), 0) AS unpaid_assets_value FROM assets
      `);
      const unpaidAssetsValue = parseFloat(unpaidAssetsResult[0].unpaid_assets_value || 0);

      // Fetch total inventory value from all stores
      const [inventoryValueResult] = await db.query(`
        SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) AS total_inventory_value
        FROM store_inventory si
        LEFT JOIN products p ON si.product_id = p.id
      `);
      const inventoryValue = parseFloat(inventoryValueResult[0].total_inventory_value || 0);

      // Fetch total payables from supplier_ledger
      const [payablesResult] = await db.query(`
        SELECT COALESCE(SUM(credit - debit), 0) as totalPayables
        FROM supplier_ledger
      `);
      const totalPayables = parseFloat(payablesResult[0].totalPayables || 0);

      // Fetch accrued expenses balance directly from journal_entry_lines for account_id = 32
      const [accruedJournalResult] = await db.query(`
        SELECT COALESCE(SUM(credit_amount - debit_amount), 0) AS accrued_journal_balance
        FROM journal_entry_lines
        WHERE account_id = 32
      `);
      const accruedJournalBalance = parseFloat(accruedJournalResult[0].accrued_journal_balance || 0);

      // Group by account_category id for equity (id = 3)
      const assets = accountsResult.filter(a => a.category_id === 1); // 1 = Assets
      let liabilities = accountsResult.filter(a => a.category_id === 2); // 2 = Liabilities
      const equity = accountsResult.filter(a => a.category_id === 3); // 3 = Equity

      // Add payables and accrued expenses as separate lines in the liabilities array
      liabilities = [
        ...liabilities,
        {
          account_code: null,
          account_name: 'Accounts Payable (from supplier ledger)',
          account_type: 'liability',
          balance: totalPayables
        },
        {
          account_code: null,
          account_name: 'Accrued Expenses (from journal entries)',
          account_type: 'liability',
          balance: accruedJournalBalance
        }
      ];

      const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, liability) => sum + liability.balance, 0);
      const totalEquity = equity.reduce((sum, eq) => sum + eq.balance, 0);

      // More flexible matching for Net Book Value calculation
      const fixedAssets = accountsResult.filter(a =>
        a.account_name && (
          a.account_name.toLowerCase().includes('fixed asset') ||
          a.account_name.toLowerCase().includes('fixed assets') ||
          a.account_name.toLowerCase().includes('property') ||
          a.account_name.toLowerCase().includes('equipment')
        )
      );
      const accumulatedDep = accountsResult.find(a =>
        a.account_name && (
          a.account_name.toLowerCase().includes('accumulated depreciation') ||
          a.account_name.toLowerCase().includes('depreciation')
        )
      );
      const unpaidAssets = accountsResult.find(a =>
        a.account_name && (
          a.account_name.toLowerCase().includes('unpaid asset') ||
          a.account_name.toLowerCase().includes('unpaid assets')
        )
      );
      const inventoryAsset = accountsResult.find(a =>
        a.account_name && (
          a.account_name.toLowerCase().includes('inventory')
        )
      );

      const fixedAssetsTotal = fixedAssets.reduce((sum, a) => sum + (typeof a.balance === 'number' ? a.balance : 0), 0);
      const unpaidAssetsTotal = unpaidAssets ? unpaidAssets.balance : 0;
      const inventoryTotal = inventoryAsset ? inventoryAsset.balance : 0;
      const accumulatedDepTotal = accumulatedDep ? accumulatedDep.balance : 0;

      const netBookValueWithExtras = fixedAssetsTotal + unpaidAssetsTotal + inventoryTotal - accumulatedDepTotal;

      // Add unpaid assets and inventory as separate lines in the assets array only if not already included
      const hasUnpaidAssets = assets.some(a => a.account_name && a.account_name.toLowerCase().includes('unpaid asset'));
      const hasInventory = assets.some(a => a.account_name && a.account_name.toLowerCase().includes('inventory'));

      const assetsWithExtras = [
        ...assets,
        ...(!hasUnpaidAssets && unpaidAssetsValue > 0 ? [{
          account_code: null,
          account_name: 'Unpaid Assets (from assets table)',
          category_name: 'assets',
          account_type: 'asset',
          balance: unpaidAssetsValue
        }] : []),
        ...(!hasInventory && inventoryValue > 0 ? [{
          account_code: null,
          account_name: 'Inventory (from store inventory)',
          category_name: 'assets',
          account_type: 'asset',
          balance: inventoryValue
        }] : [])
      ];

      // Ensure all balances are numbers
      const safeAssets = assetsWithExtras.map(a => ({
        ...a,
        balance: typeof a.balance === 'string' ? parseFloat(a.balance) : Number(a.balance) || 0
      }));
      const totalAssetsWithExtras = safeAssets.reduce((sum, asset) => sum + asset.balance, 0);
      console.log('assetsWithExtras:', safeAssets);
      console.log('totalAssetsWithExtras:', totalAssetsWithExtras);
      console.log('fixedAssets:', fixedAssets);
      console.log('accumulatedDep:', accumulatedDep);
      console.log('unpaidAssets:', unpaidAssets);
      console.log('inventoryAsset:', inventoryAsset);
      console.log('netBookValueWithExtras:', netBookValueWithExtras);

      // Log all asset account names for debugging
      console.log('All asset account names:', safeAssets.map(a => a.account_name));

      // Ensure Accum. Depreciation (account_code '520007') is included as a line item in assets
      const hasAccumDep = safeAssets.some(a => a.account_code === '520007');
      const assetsWithAccumDep = hasAccumDep
        ? safeAssets
        : [
            ...safeAssets,
            {
              account_code: '520007',
              account_name: 'Accum. Depreciation',
              category_name: 'assets',
              account_type: 'asset',
              balance: accumulatedDepTotal
            }
          ];

      const reportData = {
        as_of_date: as_of_date || new Date().toISOString().split('T')[0],
        assets: assetsWithAccumDep,
        liabilities,
        equity,
        total_assets: totalAssetsWithExtras,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        total_liabilities_and_equity: totalLiabilities + totalEquity,
        net_book_value: netBookValueWithExtras,
        unpaid_assets_value: unpaidAssetsValue,
        inventory_value: inventoryValue
      };

      res.json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error generating balance sheet report:', error);
      res.status(500).json({ success: false, error: 'Failed to generate balance sheet report' });
    }
  },

  // Get Cash Flow Report
  getCashFlowReport: async (req, res) => {
    try {
      const { period, start_date, end_date } = req.query;
      
      let dateFilter = '';
      let params = [];
      
      if (period === 'custom' && start_date && end_date) {
        dateFilter = 'WHERE je.entry_date BETWEEN ? AND ?';
        params = [start_date, end_date];
      } else {
        switch (period) {
          case 'current_month':
            dateFilter = 'WHERE YEAR(je.entry_date) = YEAR(CURDATE()) AND MONTH(je.entry_date) = MONTH(CURDATE())';
            break;
          case 'current_quarter':
            dateFilter = 'WHERE YEAR(je.entry_date) = YEAR(CURDATE()) AND QUARTER(je.entry_date) = QUARTER(CURDATE())';
            break;
          case 'current_year':
            dateFilter = 'WHERE YEAR(je.entry_date) = YEAR(CURDATE())';
            break;
          default:
            dateFilter = 'WHERE YEAR(je.entry_date) = YEAR(CURDATE()) AND MONTH(je.entry_date) = MONTH(CURDATE())';
        }
      }

      // Get cash flow from operations
      const [operationsResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as net_change
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        ${dateFilter}
        WHERE coa.account_code IN ('1000', '1100', '1200', '4000', '5000', '5100', '5200', '5300', '5400', '5500', '5600', '5700', '5800')
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Get cash flow from investing
      const [investingResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as net_change
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        ${dateFilter}
        WHERE coa.account_code IN ('1400', '520007')
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Get cash flow from financing
      const [financingResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as net_change
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        ${dateFilter}
        WHERE coa.account_code IN ('2000', '2100', '2200', '3000', '3100', '3200')
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      const cashFlowFromOperations = operationsResult.reduce((sum, op) => sum + op.net_change, 0);
      const cashFlowFromInvesting = investingResult.reduce((sum, inv) => sum + inv.net_change, 0);
      const cashFlowFromFinancing = financingResult.reduce((sum, fin) => sum + fin.net_change, 0);
      const netCashFlow = cashFlowFromOperations + cashFlowFromInvesting + cashFlowFromFinancing;

      const reportData = {
        period: period || 'current_month',
        operations: {
          items: operationsResult,
          total: cashFlowFromOperations
        },
        investing: {
          items: investingResult,
          total: cashFlowFromInvesting
        },
        financing: {
          items: financingResult,
          total: cashFlowFromFinancing
        },
        net_cash_flow: netCashFlow
      };

      res.json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error generating cash flow report:', error);
      res.status(500).json({ success: false, error: 'Failed to generate cash flow report' });
    }
  },

  getJournalEntriesForAccount: async (req, res) => {
    try {
      const { account_id } = req.params;
      const [rows] = await db.query(
        `SELECT * FROM journal_entry_lines WHERE account_id = ? ORDER BY id DESC`,
        [account_id]
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching journal entry lines for account:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch journal entry lines' });
    }
  }
};

module.exports = reportsController; 