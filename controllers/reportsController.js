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

      // Get payroll expenses separately (Net Wages account 38)
      const [payrollResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.id = 38 ${expenseWhere ? 'AND ' + expenseWhere.replace(/^WHERE /, '') : ''}
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Combine expense and payroll results
      const allExpenses = [...expenseResult, ...payrollResult];

      // Map revenue and expense accounts by code
      const salesRevenue = parseFloat(revenueResult.find(r => r.account_code === '400001')?.balance || 0);
      const otherIncome = parseFloat(revenueResult.find(r => r.account_code === '400006')?.balance || 0);
      const totalRevenue = salesRevenue + otherIncome;

      const costOfGoodsSold = parseFloat(allExpenses.find(e => e.account_code === '500000')?.balance || 0);

      // Get depreciation expenses specifically (account_type = 17)
      const depreciationExpenses = allExpenses.filter(e => 
        e.account_code === '5700' || e.account_name.toLowerCase().includes('depreciation')
      );
      const totalDepreciation = depreciationExpenses.reduce((sum, e) => sum + parseFloat(e.balance || 0), 0);

      // Get payroll expenses (Net Wages account 38)
      const payrollExpenses = allExpenses.filter(e => e.account_code === '38');
      const totalPayroll = payrollExpenses.reduce((sum, e) => sum + parseFloat(e.balance || 0), 0);

      // Get all operating expenses except COGS, depreciation, and payroll
      const operatingExpenseAccounts = allExpenses.filter(e => 
        e.account_code !== '500000' && 
        e.account_code !== '5700' && 
        e.account_code !== '38' &&
        !e.account_name.toLowerCase().includes('depreciation')
      );
      const operatingExpensesBreakdown = operatingExpenseAccounts.map(e => ({
        account_code: e.account_code,
        account_name: e.account_name,
        balance: parseFloat(e.balance || 0)
      }));
      const totalOperatingExpenses = operatingExpensesBreakdown.reduce((sum, e) => sum + e.balance, 0);

      const totalExpenses = costOfGoodsSold + totalOperatingExpenses + totalDepreciation + totalPayroll;
      const grossProfit = totalRevenue - costOfGoodsSold;
      const netProfit = grossProfit - totalOperatingExpenses - totalDepreciation - totalPayroll;
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
          payroll_expenses: payrollExpenses.map(e => ({
            account_code: e.account_code,
            account_name: e.account_name,
            balance: parseFloat(e.balance || 0)
          })),
          total_payroll: totalPayroll,
          depreciation_expenses: depreciationExpenses.map(e => ({
            account_code: e.account_code,
            account_name: e.account_name,
            balance: parseFloat(e.balance || 0)
          })),
          total_depreciation: totalDepreciation,
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
      const { as_of_date, compare_date } = req.query;
      const dateFilter = as_of_date ? 'AND je.entry_date <= ?' : 'AND je.entry_date <= CURDATE()';
      const compareDateFilter = compare_date ? 'AND je.entry_date <= ?' : '';
      const params = as_of_date ? [as_of_date] : [];
      const compareParams = compare_date ? [compare_date] : [];

      // Get all account balances for current period
      const [accountsResult] = await db.query(`
        SELECT 
          coa.id,
          coa.account_code,
          coa.account_name,
          coa.account_type,
          coa.parent_account_id,
          COALESCE(SUM(
            CASE 
              WHEN coa.account_type = 1 AND coa.account_code = '1500' THEN jel.credit_amount - jel.debit_amount
              WHEN coa.account_type = 1 THEN jel.debit_amount - jel.credit_amount
              WHEN coa.account_type = 2 THEN jel.debit_amount - jel.credit_amount
              WHEN coa.account_type = 13 THEN jel.credit_amount - jel.debit_amount
              ELSE jel.credit_amount - jel.debit_amount
            END
          ), 0) as balance
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE coa.is_active = true ${dateFilter}
        GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.parent_account_id
        ORDER BY coa.account_code
      `, params);

      // Get comparative balances if compare_date is provided
      let comparativeBalances = {};
      if (compare_date) {
        const [compareResult] = await db.query(`
          SELECT 
            coa.id,
            coa.account_code,
            COALESCE(SUM(
              CASE 
                WHEN coa.account_type = 1 AND coa.account_code = '1500' THEN jel.credit_amount - jel.debit_amount
                WHEN coa.account_type = 1 THEN jel.debit_amount - jel.credit_amount
                WHEN coa.account_type = 2 THEN jel.debit_amount - jel.credit_amount
                WHEN coa.account_type = 13 THEN jel.credit_amount - jel.debit_amount
                ELSE jel.credit_amount - jel.debit_amount
              END
            ), 0) as balance
          FROM chart_of_accounts coa
          LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
          LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
          WHERE coa.is_active = true ${compareDateFilter}
          GROUP BY coa.id, coa.account_code
        `, compareParams);
        
        comparativeBalances = compareResult.reduce((acc, row) => {
          acc[row.account_code] = row.balance;
          return acc;
        }, {});
      }

      // Fetch additional data sources
      const [unpaidAssetsResult] = await db.query(`
        SELECT COALESCE(SUM(purchase_value), 0) AS unpaid_assets_value FROM assets
      `);
      const unpaidAssetsValue = parseFloat(unpaidAssetsResult[0].unpaid_assets_value || 0);

      const [inventoryValueResult] = await db.query(`
        SELECT COALESCE(SUM(si.quantity * p.cost_price), 0) AS total_inventory_value
        FROM store_inventory si
        LEFT JOIN products p ON si.product_id = p.id
      `);
      const inventoryValue = parseFloat(inventoryValueResult[0].total_inventory_value || 0);

      const [payablesResult] = await db.query(`
        SELECT COALESCE(SUM(credit - debit), 0) as totalPayables
        FROM supplier_ledger
        ${as_of_date ? 'WHERE date <= ?' : ''}
      `, as_of_date ? [as_of_date] : []);
      const totalPayables = parseFloat(payablesResult[0].totalPayables || 0);

      const [accruedJournalResult] = await db.query(`
        SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) AS accrued_journal_balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id = 32 ${dateFilter}
      `, params);
      const accruedJournalBalance = parseFloat(accruedJournalResult[0].accrued_journal_balance || 0);

      // Calculate accumulated depreciation
      const [accumulatedDepreciationResult] = await db.query(`
        SELECT COALESCE(SUM(jel.debit_amount), 0) as total_accumulated_depreciation
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE coa.account_type = 17
        AND jel.debit_amount > 0
        ${dateFilter}
      `, params);
      const totalAccumulatedDepreciation = parseFloat(accumulatedDepreciationResult[0].total_accumulated_depreciation || 0);

      // Categorize accounts
      const categorizeAccounts = (accounts, type) => {
        const categorized = {
          current: [],
          non_current: [],
          other: []
        };

        accounts.forEach(account => {
          const balance = typeof account.balance === 'string' ? parseFloat(account.balance) : Number(account.balance) || 0;
          const accountData = {
            ...account,
            balance,
            comparative_balance: comparativeBalances[account.account_code] || 0,
            change: balance - (comparativeBalances[account.account_code] || 0),
            change_percentage: comparativeBalances[account.account_code] ? 
              ((balance - comparativeBalances[account.account_code]) / Math.abs(comparativeBalances[account.account_code])) * 100 : 0
          };

          // Categorize based on account codes and names
          if (type === 'assets') {
            if (['1000', '1100', '1200', '1300', '100001'].includes(account.account_code) || 
                account.account_name.toLowerCase().includes('cash') ||
                account.account_name.toLowerCase().includes('bank') ||
                account.account_name.toLowerCase().includes('receivable') ||
                account.account_name.toLowerCase().includes('inventory') ||
                account.account_name.toLowerCase().includes('stock') ||
                account.account_name.toLowerCase().includes('debtors control')) {
              categorized.current.push(accountData);
            } else if (['1400', '1500'].includes(account.account_code) ||
                       account.account_name.toLowerCase().includes('equipment') ||
                       account.account_name.toLowerCase().includes('vehicle') ||
                       account.account_name.toLowerCase().includes('building') ||
                       account.account_name.toLowerCase().includes('depreciation')) {
              categorized.non_current.push(accountData);
            } else {
              categorized.other.push(accountData);
            }
          } else if (type === 'liabilities') {
            if (['2000', '2100', '2200'].includes(account.account_code) ||
                account.account_name.toLowerCase().includes('payable') ||
                account.account_name.toLowerCase().includes('accrued')) {
              categorized.current.push(accountData);
            } else if (['2300', '2400'].includes(account.account_code) ||
                       account.account_name.toLowerCase().includes('loan') ||
                       account.account_name.toLowerCase().includes('mortgage')) {
              categorized.non_current.push(accountData);
            } else {
              categorized.other.push(accountData);
            }
          } else if (type === 'equity') {
            // For now, treat all equity as current equity
            categorized.current.push(accountData);
          }
        });

        return categorized;
      };

      // Group accounts by type
      const assets = accountsResult.filter(a => a.account_type === 1);
      let liabilities = accountsResult.filter(a => a.account_type === 2);
      const equity = accountsResult.filter(a => a.account_type === 13);
      // --- Add this: get all cash and equivalents accounts ---
      const cashAndEquivalents = accountsResult.filter(a => a.account_type === 9);
      // --- Add this: get all accounts receivable ---
      const accountsReceivable = accountsResult.filter(a => a.account_type === 2);
      // --- Add this: get stock and debtors control accounts ---
      const stockAccounts = accountsResult.filter(a => a.account_type === 6);
      const debtorsControlAccounts = accountsResult.filter(a => a.account_type === 7);

      // Add additional data sources to appropriate categories
      const assetsWithExtras = [
        ...assets,
        ...cashAndEquivalents.filter(
          ca => !assets.some(a => a.id === ca.id)
        ),
        ...accountsReceivable.filter(
          ar => !assets.some(a => a.id === ar.id) && !cashAndEquivalents.some(ca => ca.id === ar.id)
        ),
        ...stockAccounts.filter(
          stock => !assets.some(a => a.id === stock.id) && !cashAndEquivalents.some(ca => ca.id === stock.id) && !accountsReceivable.some(ar => ar.id === stock.id)
        ),
        ...debtorsControlAccounts.filter(
          debtors => !assets.some(a => a.id === debtors.id) && !cashAndEquivalents.some(ca => ca.id === debtors.id) && !accountsReceivable.some(ar => ar.id === debtors.id) && !stockAccounts.some(stock => stock.id === debtors.id)
        ),
        ...(inventoryValue > 0 ? [{
          id: 1300,
          account_code: '1300',
          account_name: 'Inventory (from store inventory)',
          account_type: 1,
          balance: inventoryValue,
          comparative_balance: 0,
          change: inventoryValue,
          change_percentage: 0
        }] : []),
        ...(unpaidAssetsValue > 0 ? [{
          id: 1400,
          account_code: '1400',
          account_name: 'Unpaid Assets (from assets table)',
          account_type: 1,
          balance: unpaidAssetsValue,
          comparative_balance: 0,
          change: unpaidAssetsValue,
          change_percentage: 0
        }] : [])
      ];
      // --- Add this: calculate cash and equivalents subtotal ---
      const cashAndEquivalentsTotal = cashAndEquivalents.reduce((sum, acc) => sum + (typeof acc.balance === 'string' ? parseFloat(acc.balance) : Number(acc.balance) || 0), 0);

      // Ensure accumulated depreciation is included
      const hasAccumDep = assetsWithExtras.some(a => a.account_code === '1500');
      const assetsWithAccumDep = hasAccumDep
        ? assetsWithExtras.map(asset => 
            asset.account_code === '1500' 
              ? { 
                  ...asset, 
                  balance: -Math.abs(totalAccumulatedDepreciation),
                  comparative_balance: -(comparativeBalances['1500'] || 0),
                  change: -Math.abs(totalAccumulatedDepreciation) + (comparativeBalances['1500'] || 0)
                }
              : asset
          )
        : [
            ...assetsWithExtras,
            {
              id: 1500,
              account_code: '1500',
              account_name: 'Accumulated Depreciation',
              account_type: 1,
              balance: -Math.abs(totalAccumulatedDepreciation),
              comparative_balance: 0,
              change: -Math.abs(totalAccumulatedDepreciation),
              change_percentage: 0
            }
          ];

      // Add payables and accrued expenses to liabilities
      liabilities = [
        ...liabilities,
        {
          id: 30,
          account_code: '30',
          account_name: 'Accounts Payable',
          account_type: 2,
          balance: totalPayables,
          comparative_balance: 0,
          change: totalPayables,
          change_percentage: 0
        },
        {
          id: 32,
          account_code: '32',
          account_name: 'Accrued Expenses',
          account_type: 2,
          balance: accruedJournalBalance,
          comparative_balance: 0,
          change: accruedJournalBalance,
          change_percentage: 0
        }
      ];

      // Add payroll-related liabilities
      const payrollLiabilities = [
        {
          id: 37,
          account_code: '37',
          account_name: 'PAYE Payable',
          account_type: 2,
          balance: 0, // Will be calculated from journal entries
          comparative_balance: 0,
          change: 0,
          change_percentage: 0
        },
        {
          id: 39,
          account_code: '39',
          account_name: 'NSSF Payable',
          account_type: 2,
          balance: 0, // Will be calculated from journal entries
          comparative_balance: 0,
          change: 0,
          change_percentage: 0
        },
        {
          id: 40,
          account_code: '40',
          account_name: 'NHIF Payable',
          account_type: 2,
          balance: 0, // Will be calculated from journal entries
          comparative_balance: 0,
          change: 0,
          change_percentage: 0
        }
      ];

      // Calculate payroll liabilities from journal entries
      const [payrollLiabilitiesResult] = await db.query(`
        SELECT 
          jel.account_id,
          COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as balance
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE jel.account_id IN (37, 39, 40) ${dateFilter}
        GROUP BY jel.account_id
      `, params);

      // Update payroll liabilities with actual balances
      payrollLiabilities.forEach(liability => {
        const accountId = parseInt(liability.account_code);
        const result = payrollLiabilitiesResult.find(r => r.account_id === accountId);
        if (result) {
          liability.balance = parseFloat(result.balance || 0);
          liability.change = liability.balance;
        }
      });

      // Add payroll liabilities to the main liabilities array
      liabilities = [...liabilities, ...payrollLiabilities];

      // Categorize all sections
      const categorizedAssets = categorizeAccounts(assetsWithAccumDep, 'assets');
      const categorizedLiabilities = categorizeAccounts(liabilities, 'liabilities');
      const categorizedEquity = categorizeAccounts(equity, 'equity');

      // Calculate subtotals
      const calculateSubtotals = (categorized) => {
        const current = categorized.current.reduce((sum, item) => sum + item.balance, 0);
        const nonCurrent = categorized.non_current.reduce((sum, item) => sum + item.balance, 0);
        const other = categorized.other.reduce((sum, item) => sum + item.balance, 0);
        const total = current + nonCurrent + other;
        
        return { current, nonCurrent, other, total };
      };

      const assetSubtotals = calculateSubtotals(categorizedAssets);
      const liabilitySubtotals = calculateSubtotals(categorizedLiabilities);
      const equitySubtotals = calculateSubtotals(categorizedEquity);

      // Calculate working capital and ratios
      const workingCapital = assetSubtotals.current - liabilitySubtotals.current;
      const currentRatio = liabilitySubtotals.current > 0 ? assetSubtotals.current / liabilitySubtotals.current : 0;
      const debtToEquityRatio = equitySubtotals.total > 0 ? liabilitySubtotals.total / equitySubtotals.total : 0;
      const debtToAssetRatio = assetSubtotals.total > 0 ? liabilitySubtotals.total / assetSubtotals.total : 0;

      // Generate notes and disclosures
      const notes = [
        {
          id: 1,
          title: "Basis of Preparation",
          content: "The balance sheet is prepared on an accrual basis and includes all material assets, liabilities, and equity as of the reporting date."
        },
        {
          id: 2,
          title: "Significant Accounting Policies",
          content: "Assets are recorded at historical cost less accumulated depreciation. Liabilities are recorded at their estimated settlement amounts."
        },
        {
          id: 3,
          title: "Inventory Valuation",
          content: `Inventory is valued at cost using the weighted average method. Total inventory value as of ${as_of_date || 'current date'}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inventoryValue)}`
        },
        {
          id: 4,
          title: "Depreciation",
          content: `Accumulated depreciation represents the total depreciation expense recorded to date. Current period accumulated depreciation: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAccumulatedDepreciation)}`
        },
        {
          id: 5,
          title: "Accounts Payable",
          content: `Accounts payable includes amounts owed to suppliers and vendors. Total payables as of ${as_of_date || 'current date'}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalPayables)}`
        }
      ];

      // Prepare drill-down data for key accounts
      const drillDownData = {
        cash_and_equivalents: accountsResult.filter(a => a.account_type === 9),
        accounts_receivable: categorizedAssets.current.filter(a => 
          a.account_name.toLowerCase().includes('receivable')
        ),
        inventory: categorizedAssets.current.filter(a => 
          a.account_name.toLowerCase().includes('inventory')
        ),
        fixed_assets: categorizedAssets.non_current.filter(a => 
          !a.account_name.toLowerCase().includes('depreciation')
        ),
        accounts_payable: categorizedLiabilities.current.filter(a => 
          a.account_name.toLowerCase().includes('payable')
        ),
        accrued_expenses: categorizedLiabilities.current.filter(a => 
          a.account_name.toLowerCase().includes('accrued')
        )
      };

      const reportData = {
        as_of_date: as_of_date || new Date().toISOString().split('T')[0],
        compare_date: compare_date || null,
        assets: {
          current: categorizedAssets.current,
          non_current: categorizedAssets.non_current,
          other: categorizedAssets.other,
          subtotals: assetSubtotals,
          // --- Add this ---
          cash_and_equivalents_total: cashAndEquivalentsTotal
        },
        liabilities: {
          current: categorizedLiabilities.current,
          non_current: categorizedLiabilities.non_current,
          other: categorizedLiabilities.other,
          subtotals: liabilitySubtotals
        },
        equity: {
          accounts: categorizedEquity.current.concat(categorizedEquity.non_current, categorizedEquity.other),
          subtotals: equitySubtotals
        },
        totals: {
          total_assets: assetSubtotals.total,
          total_liabilities: liabilitySubtotals.total,
          total_equity: equitySubtotals.total,
          total_liabilities_and_equity: liabilitySubtotals.total + equitySubtotals.total
        },
        ratios: {
          working_capital: workingCapital,
          current_ratio: currentRatio,
          debt_to_equity_ratio: debtToEquityRatio,
          debt_to_asset_ratio: debtToAssetRatio
        },
        notes,
        drill_down_data: drillDownData,
        metadata: {
          generated_at: new Date().toISOString(),
          has_comparative_data: !!compare_date,
          total_accounts: accountsResult.length,
          significant_accounts: accountsResult.filter(a => Math.abs(a.balance) > 10000).length
        }
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
        WHERE 1=1
        ${dateFilter ? 'AND ' + dateFilter.replace(/^WHERE /, '') : ''}
        AND coa.account_code IN ('1100', '1200', '4000', '5000', '5100', '5200', '5300', '5400', '5500', '5600', '5700', '5800')
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Get payroll-related cash flows
      const [payrollCashFlowResult] = await db.query(`
        SELECT 
          CASE 
            WHEN jel.account_id = 37 THEN '37'
            WHEN jel.account_id = 39 THEN '39'
            WHEN jel.account_id = 40 THEN '40'
            ELSE 'payment_account'
          END as account_code,
          CASE 
            WHEN jel.account_id = 37 THEN 'PAYE Tax Payments'
            WHEN jel.account_id = 39 THEN 'NSSF Payments'
            WHEN jel.account_id = 40 THEN 'NHIF Payments'
            ELSE 'Payroll Payment Account'
          END as account_name,
          -COALESCE(SUM(jel.credit_amount), 0) as net_change
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE 1=1
        ${dateFilter ? 'AND ' + dateFilter.replace(/^WHERE /, '') : ''}
        AND jel.account_id IN (37, 39, 40)
        AND je.reference LIKE 'PAYROLL-%'
        GROUP BY 
          CASE 
            WHEN jel.account_id = 37 THEN '37'
            WHEN jel.account_id = 39 THEN '39'
            WHEN jel.account_id = 40 THEN '40'
            ELSE 'payment_account'
          END,
          CASE 
            WHEN jel.account_id = 37 THEN 'PAYE Tax Payments'
            WHEN jel.account_id = 39 THEN 'NSSF Payments'
            WHEN jel.account_id = 40 THEN 'NHIF Payments'
            ELSE 'Payroll Payment Account'
          END
      `, params);

      // Get payroll payment account cash flows (the actual payment account used)
      const [payrollPaymentResult] = await db.query(`
        SELECT 
          coa.account_code,
          CONCAT('Payroll - ', coa.account_name) as account_name,
          -COALESCE(SUM(jel.credit_amount), 0) as net_change
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE 1=1
        ${dateFilter ? 'AND ' + dateFilter.replace(/^WHERE /, '') : ''}
        AND je.reference LIKE 'PAYROLL-%'
        AND jel.description LIKE '%Net wages payment%'
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Combine payroll tax payments and payment account flows
      const allPayrollCashFlow = [...payrollCashFlowResult, ...payrollPaymentResult];

      // Get cash flow from investing
      const [investingResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0) as net_change
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE 1=1
        ${dateFilter ? 'AND ' + dateFilter.replace(/^WHERE /, '') : ''}
        AND coa.account_code IN ('1400', '520007')
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Get cash flow from financing
      const [financingResult] = await db.query(`
        SELECT 
          coa.account_code,
          coa.account_name,
          COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as net_change
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE 1=1
        ${dateFilter ? 'AND ' + dateFilter.replace(/^WHERE /, '') : ''}
        AND coa.account_code IN ('2000', '2100', '2200', '3000', '3100', '3200')
        GROUP BY coa.id, coa.account_code, coa.account_name
      `, params);

      // Combine operations and payroll cash flows
      const allOperationsCashFlow = [...operationsResult, ...allPayrollCashFlow];

      // Calculate totals with proper sign handling
      const cashFlowFromOperations = allOperationsCashFlow.reduce((sum, op) => sum + op.net_change, 0);
      const cashFlowFromInvesting = investingResult.reduce((sum, inv) => sum + inv.net_change, 0);
      const cashFlowFromFinancing = financingResult.reduce((sum, fin) => sum + fin.net_change, 0);
      const netCashFlow = cashFlowFromOperations + cashFlowFromInvesting + cashFlowFromFinancing;

      const reportData = {
        period: period || 'current_month',
        operations: {
          items: allOperationsCashFlow,
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

  // Get Product Performance Report
  getProductPerformanceReport: async (req, res) => {
    try {
      const { startDate, endDate, productType, country, region } = req.query;
      let whereClauses = [];
      const params = [];
      if (startDate && endDate) {
        whereClauses.push('so.order_date BETWEEN ? AND ?');
        params.push(startDate, endDate);
      } else if (startDate) {
        whereClauses.push('so.order_date >= ?');
        params.push(startDate);
      } else if (endDate) {
        whereClauses.push('so.order_date <= ?');
        params.push(endDate);
      }
      // Filter by product type (vape or pouch)
      if (productType === 'vape') {
        whereClauses.push('(p.category_id = 1 OR p.category_id = 3)');
      } else if (productType === 'pouch') {
        whereClauses.push('(p.category_id = 4 OR p.category_id = 5)');
      }
      if (country) {
        whereClauses.push('co.name = ?');
        params.push(country);
      }
      if (region) {
        whereClauses.push('r.name = ?');
        params.push(region);
      }
      const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
      const [rows] = await db.query(`
        SELECT 
          p.id as product_id,
          p.product_name,
          p.category_id,
          SUM(soi.quantity) as total_quantity_sold,
          SUM(soi.total_price) as total_sales_value
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN Country co ON c.countryId = co.id
        LEFT JOIN Regions r ON c.region_id = r.id
        ${whereClause}
        GROUP BY p.id, p.product_name, p.category_id
        ORDER BY total_sales_value DESC
      `, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching product performance report:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch product performance report' });
    }
  },

  // General Ledger Report
  getGeneralLedger: async (req, res) => {
    try {
      // Fetch all journal entry lines with account and journal entry info
      const [rows] = await db.query(`
        SELECT 
          jel.id,
          je.entry_date AS date,
          coa.account_code,
          coa.account_name,
          jel.description,
          je.reference,
          jel.debit_amount AS debit,
          jel.credit_amount AS credit
        FROM journal_entry_lines jel
        JOIN journal_entries je ON jel.journal_entry_id = je.id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        ORDER BY je.entry_date ASC, jel.id ASC
      `);

      // Calculate running balance (overall, not per account)
      let balance = 0;
      const entries = rows.map(row => {
        balance += (row.debit || 0) - (row.credit || 0);
        return {
          id: row.id,
          date: row.date,
          account_code: row.account_code,
          account_name: row.account_name,
          description: row.description,
          reference: row.reference,
          debit: row.debit,
          credit: row.credit,
          balance: balance
        };
      });

      res.json({ success: true, data: entries });
    } catch (error) {
      console.error('Error generating general ledger report:', error);
      res.status(500).json({ success: false, error: 'Failed to generate general ledger report' });
    }
  },

  // List all journal entries with filters
  listJournalEntries: async (req, res) => {
    try {
      const { start_date, end_date, account_id, account_code, reference, description } = req.query;
      let sql = `
        SELECT 
          je.id as journal_entry_id,
          je.entry_number,
          je.entry_date,
          je.reference,
          je.description as journal_description,
          je.total_debit,
          je.total_credit,
          je.status,
          je.created_at,
          jel.id as line_id,
          jel.account_id,
          coa.account_code,
          coa.account_name,
          jel.debit_amount,
          jel.credit_amount,
          jel.description as line_description
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE 1=1
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
      if (account_id) {
        sql += ' AND jel.account_id = ?';
        params.push(account_id);
      }
      if (account_code) {
        sql += ' AND coa.account_code = ?';
        params.push(account_code);
      }
      if (reference) {
        sql += ' AND je.reference LIKE ?';
        params.push(`%${reference}%`);
      }
      if (description) {
        sql += ' AND (je.description LIKE ? OR jel.description LIKE ?)';
        params.push(`%${description}%`, `%${description}%`);
      }
      sql += ' ORDER BY je.entry_date DESC, je.id DESC, jel.id ASC';
      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
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
  },

  // Get journal entries for a specific invoice/sales order
  getJournalEntriesForInvoice: async (req, res) => {
    try {
      const { invoice_id } = req.params;
      
      // First, get the invoice number from the sales_orders table
      const [invoiceRows] = await db.query(
        'SELECT so_number FROM sales_orders WHERE id = ?',
        [invoice_id]
      );
      
      if (invoiceRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      
      const invoiceNumber = invoiceRows[0].so_number;
      
      // Now search for journal entries with this invoice number as reference
      const [rows] = await db.query(`
        SELECT 
          je.id as journal_entry_id,
          je.entry_number,
          je.entry_date,
          je.reference,
          je.description as journal_description,
          je.total_debit,
          je.total_credit,
          je.status,
          jel.id as line_id,
          jel.account_id,
          coa.account_code,
          coa.account_name,
          jel.debit_amount,
          jel.credit_amount,
          jel.description as line_description
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE je.reference = ?
        ORDER BY je.entry_date DESC, je.id DESC, jel.id ASC
      `, [invoiceNumber]);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching journal entries for invoice:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch journal entries for invoice' });
    }
  }
};

module.exports = reportsController; 