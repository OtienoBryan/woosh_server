const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Simple JWT auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    // Map userId to id for consistency
    req.user = {
      ...user,
      id: user.userId || user.id
    };
    next();
  });
}
const {
  chartOfAccountsController,
  suppliersController,
  customersController,
  productsController,
  dashboardController,
  getAssetTypes,
  addAsset,
  getAssets,
  getAssetAccounts,
  getDepreciationAccounts,
  getDepreciationHistory,
  postDepreciation,
  getCashAndEquivalents,
  postExpense,
  addEquityEntry,
  listEquityEntries,
  addBulkEquityEntries,
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
  getAllAssetsWithDepreciation,
  getAssetsTotalValue,
  getAllExpenses,
  getExpenseSummary,
  getExpenseItems,
  getJournalEntryById,
  getExpenseInvoice,
  createJournalEntry,
  getProductsSaleReport,
  createExpensePayment,
  getPendingExpensePayments,
  updateExpensePaymentStatus
} = require('../controllers/financialController');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const storeController = require('../controllers/storeController');
const payablesController = require('../controllers/payablesController');
const invoiceController = require('../controllers/invoiceController');
const receivablesController = require('../controllers/receivablesController');
const reportsController = require('../controllers/reportsController');
const salesOrderController = require('../controllers/salesOrderController');
const creditNoteController = require('../controllers/creditNoteController');

// Chart of Accounts Routes
router.get('/accounts', chartOfAccountsController.getAllAccounts);
router.get('/accounts/type/:account_type', chartOfAccountsController.getAccountsByType);
router.get('/expense-types', chartOfAccountsController.getExpenseTypes);
router.get('/accounts/type16', chartOfAccountsController.getAccountsByType16);
router.get('/accounts/:id', chartOfAccountsController.getAccountById);
router.post('/accounts', chartOfAccountsController.createAccount);
router.put('/accounts/:id', chartOfAccountsController.updateAccount);
router.delete('/accounts/:id', chartOfAccountsController.deleteAccount);
router.get('/accounts/:account_id/ledger', payablesController.getAccountLedger);

// Suppliers Routes
router.get('/suppliers', suppliersController.getAllSuppliers);
router.get('/suppliers/:id', suppliersController.getSupplierById);
router.post('/suppliers', suppliersController.createSupplier);
router.put('/suppliers/:id', suppliersController.updateSupplier);
router.delete('/suppliers/:id', suppliersController.deleteSupplier);

// Customers Routes
router.get('/customers', customersController.getAllCustomers);
router.get('/customers/:id', customersController.getCustomerById);
router.post('/customers', customersController.createCustomer);
router.put('/customers/:id', customersController.updateCustomer);
router.delete('/customers/:id', customersController.deleteCustomer);

// Products Routes
router.get('/products', productsController.getAllProducts);
router.get('/products/:id', productsController.getProductById);
router.post('/products', uploadProductImageMulter.single('image'), createProduct);
router.put('/products/:id', productsController.updateProduct);
router.delete('/products/:id', productsController.deleteProduct);
router.post('/products/:id/image', uploadProductImageMulter.single('image'), uploadProductImage);
router.get('/products/low-stock', productsController.getLowStockProducts);

// Dashboard Routes
router.get('/dashboard/stats', dashboardController.getDashboardStats);
router.get('/dashboard/executive-stats', dashboardController.getExecutiveDashboardStats);

// Purchase Orders Routes
router.get('/purchase-orders', purchaseOrderController.getAllPurchaseOrders);
router.get('/purchase-orders/:id', purchaseOrderController.getPurchaseOrderById);
router.get('/purchase-orders/:id/with-receipts', purchaseOrderController.getPurchaseOrderWithReceipts);
router.post('/purchase-orders', purchaseOrderController.createPurchaseOrder);
router.put('/purchase-orders/:id', purchaseOrderController.updatePurchaseOrder);
router.delete('/purchase-orders/:id', purchaseOrderController.deletePurchaseOrder);
router.patch('/purchase-orders/:id/status', purchaseOrderController.updateStatus);
router.post('/purchase-orders/:purchaseOrderId/receive', purchaseOrderController.receiveItems);

// Sales Orders Routes
router.get('/sales-orders', salesOrderController.getAllSalesOrders);
router.get('/sales-orders-all', salesOrderController.getAllSalesOrdersIncludingDrafts);
router.get('/sales-orders/current-month-data', salesOrderController.getCurrentMonthSalesData);
router.get('/sales-orders/category-performance', salesOrderController.getCategoryPerformanceData);
router.post('/sales-orders', (req, res, next) => {
  console.log('=== SALES ORDERS ROUTE HIT ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
}, salesOrderController.createSalesOrder);

// Specific sales order routes (must come before general :id routes)
router.get('/sales-orders/:id/items', salesOrderController.getSalesOrderItems);
router.post('/sales-orders/:id/receive-back', salesOrderController.receiveBackToStock);
router.post('/sales-orders/:id/convert-to-invoice', salesOrderController.convertToInvoice);
router.post('/sales-orders/:id/complete-delivery', async (req, res) => {
  console.log('Complete delivery route hit:', req.params, req.body);
  
  try {
    const { id } = req.params;
    const { recipient_name, recipient_phone, notes } = req.body;
    
    console.log('Processing delivery completion for order:', id);
    
    if (!recipient_name || !recipient_phone) {
      console.log('Missing required fields:', { recipient_name, recipient_phone });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update sales order status to delivered
    const updateResult = await db.query(`
      UPDATE sales_orders 
      SET my_status = 3, 
          status = 'delivered',
          delivery_notes = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [`Delivered to: ${recipient_name} (${recipient_phone}). ${notes || ''}`, id]);

    console.log('Update result:', updateResult);

    res.json({ 
      success: true, 
      message: 'Delivery completed successfully',
      order_id: id
    });
  } catch (error) {
    console.error('Error completing delivery:', error);
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
});

// General sales order routes (must come after specific routes)
router.get('/sales-orders/:id', salesOrderController.getSalesOrderById);
router.put('/sales-orders/:id', salesOrderController.updateSalesOrder);
router.delete('/sales-orders/:id', salesOrderController.deleteSalesOrder);
router.patch('/sales-orders/:id', salesOrderController.assignRider);

// Add POST route for uploading delivery images
router.post('/upload-delivery-image', uploadProductImageMulter.single('delivery_image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { order_id, recipient_name, recipient_phone, notes } = req.body;
    
    if (!order_id || !recipient_name || !recipient_phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Here you would typically save the image path to the database
    // For now, we'll just return success
    res.json({ 
      success: true, 
      message: 'Delivery image uploaded successfully',
      filename: req.file.filename,
      order_id,
      recipient_name,
      recipient_phone,
      notes
    });
  } catch (error) {
    console.error('Error uploading delivery image:', error);
    res.status(500).json({ error: 'Failed to upload delivery image' });
  }
});



// Stores Routes
router.get('/stores', storeController.getAllStores);
router.get('/stores/:id', storeController.getStoreById);
router.get('/stores/:storeId/inventory', storeController.getStoreInventory);
router.get('/stores-inventory', storeController.getAllStoresInventory);
router.get('/inventory-summary', storeController.getInventorySummaryByStore);
router.get('/stock-summary', storeController.getStockSummary);
router.get('/inventory/in-transit', storeController.getInTransitProducts);

// Payables Routes
router.get('/payables/aging', payablesController.getAgingPayables);
router.post('/payables/payment', payablesController.makeSupplierPayment);
router.post('/payables/confirm-payment', payablesController.confirmSupplierPayment);
router.get('/payments', payablesController.listPayments);
router.get('/suppliers/:id/ledger', payablesController.getSupplierLedger);
router.post('/suppliers/:id/pay', payablesController.paySupplier);

// Invoice Routes
router.get('/invoices', invoiceController.getAllInvoices);
router.get('/invoices/:id', invoiceController.getInvoiceById);
router.post('/invoices', invoiceController.createInvoice);
router.get('/customers/:id/ledger', invoiceController.getCustomerLedger);

// Receivables Routes
router.get('/receivables/aging', receivablesController.getAgingReceivables);
router.post('/receivables/payment', receivablesController.makeCustomerPayment);
router.post('/receivables/confirm-payment', receivablesController.confirmCustomerPayment);
router.get('/receipts', receivablesController.listReceipts);
router.get('/receipts/invoice/:invoice_id/pending', receivablesController.getPendingReceiptsForInvoice);
router.get('/receipts/invoice/:invoice_id', receivablesController.getReceiptsByInvoice);
router.get('/clients/:clientId/outstanding-balance', receivablesController.getClientOutstandingBalance);
router.put('/receipts/:id/confirm', receivablesController.confirmPayment);
router.put('/receipts/:id/decline', receivablesController.declinePayment);

// Reports Routes
router.get('/reports/profit-loss', reportsController.getProfitLossReport);
router.get('/reports/balance-sheet', reportsController.getBalanceSheetReport);
router.get('/reports/cash-flow', reportsController.getCashFlowReport);
router.get('/reports/product-performance', reportsController.getProductPerformanceReport);
router.get('/reports/cost-of-goods-sold-details', reportsController.getCostOfGoodsSoldDetails);
router.get('/reports/sales-revenue-details', reportsController.getSalesRevenueDetails);
router.get('/reports/gross-margin-details', reportsController.getGrossMarginDetails);
router.get('/reports/sales-tax', reportsController.getSalesTaxReport);
router.get('/reports/categories', reportsController.getAllCategories);
router.get('/products-sale-report', getProductsSaleReport);
router.get('/journal-entry-lines/:account_id', reportsController.getJournalEntriesForAccount);
router.get('/journal-entries/invoice/:invoice_id', reportsController.getJournalEntriesForInvoice);

// Cash and Equivalents Route
router.get('/cash-equivalents', getCashAndEquivalents);
router.get('/cash-equivalents/accounts', getAllCashAccounts);
router.post('/cash-equivalents/opening-balance', setOpeningBalance);
router.get('/cash-equivalents/accounts/:account_id/ledger', getCashAccountLedger);

// Expenses Route
router.post('/expenses', postExpense);
router.get('/expenses', getAllExpenses);
router.get('/expense-summary', getExpenseSummary);
router.get('/expenses/:journal_entry_id/items', getExpenseItems);
router.get('/expenses/:journal_entry_id/invoice', getExpenseInvoice);
router.post('/expenses/:journal_entry_id/payments', authenticateToken, createExpensePayment);
router.get('/expense-payments/pending', getPendingExpensePayments);
router.put('/expense-payments/:id/status', authenticateToken, updateExpensePaymentStatus);

// Journal Entries Route
router.get('/journal-entries/:id', getJournalEntryById);

// Asset management
router.get('/asset-types', getAssetTypes);
router.get('/asset-accounts', getAssetAccounts);
router.get('/depreciation-accounts', getDepreciationAccounts);
router.get('/depreciation-history', getDepreciationHistory);
router.post('/assets', addAsset);
router.get('/assets', getAssets);
router.post('/depreciation', postDepreciation);
router.get('/assets-with-depreciation', getAllAssetsWithDepreciation);
router.get('/assets-total-value', getAssetsTotalValue);

router.post('/equity-entries', addEquityEntry);
router.get('/equity-entries', listEquityEntries);
router.post('/equity-entries/bulk', addBulkEquityEntries);

// Journal entries route
router.get('/journal-entries', reportsController.listJournalEntries);
router.post('/journal-entries', createJournalEntry);

// General Ledger Report
router.get('/general-ledger', reportsController.getGeneralLedger);

// Inventory Transactions
router.get('/inventory-transactions', storeController.getInventoryTransactions);

// Inventory as of date
router.get('/inventory-as-of', storeController.getInventoryAsOfDate);

// Stock Transfer
router.post('/stock-transfer', storeController.recordStockTransfer);
router.get('/transfer-history', storeController.getTransferHistory);
router.post('/stock-take', storeController.recordStockTake);
router.get('/stock-take-history', storeController.getStockTakeHistory);
router.get('/stock-take/:stock_take_id/items', storeController.getStockTakeItems);
router.post('/stores/update-stock-quantity', storeController.updateStockQuantity);

// Receive to Stock from Cancelled Orders
router.post('/receive-to-stock', storeController.receiveToStockFromOrder);

router.get('/categories', getAllCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/categories/:id/price-options', getCategoryPriceOptions);
router.post('/categories/:id/price-options', addCategoryPriceOption);
router.put('/price-options/:id', updateCategoryPriceOption);
router.delete('/price-options/:id', deleteCategoryPriceOption);

router.get('/sales-reps', getSalesReps);

// Credit Notes Routes
router.get('/credit-notes', creditNoteController.getAllCreditNotes);
router.get('/credit-notes/:id', creditNoteController.getCreditNoteById);
router.post('/credit-notes', creditNoteController.createCreditNote);
router.post('/credit-notes/receive-back', authenticateToken, creditNoteController.receiveBackToStock);
router.get('/customers/:customerId/invoices-for-credit', creditNoteController.getCustomerInvoices);
router.get('/customers/:customerId/credit-notes', creditNoteController.getCustomerCreditNotes);

module.exports = router; 