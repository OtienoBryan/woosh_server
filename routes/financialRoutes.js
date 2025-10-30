const express = require('express');
const router = express.Router();
const db = require('../database/db');
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('../middleware/auth');
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

// Chart of Accounts Routes (Protected with authentication)
router.get('/accounts', authenticateToken, chartOfAccountsController.getAllAccounts);
router.get('/accounts/type/:account_type', authenticateToken, chartOfAccountsController.getAccountsByType);
router.get('/expense-types', authenticateToken, chartOfAccountsController.getExpenseTypes);
router.get('/accounts/type16', authenticateToken, chartOfAccountsController.getAccountsByType16);
router.get('/accounts/:id', authenticateToken, chartOfAccountsController.getAccountById);
router.post('/accounts', authenticateToken, chartOfAccountsController.createAccount);
router.put('/accounts/:id', authenticateToken, chartOfAccountsController.updateAccount);
router.delete('/accounts/:id', authenticateToken, chartOfAccountsController.deleteAccount);
router.get('/accounts/:account_id/ledger', authenticateToken, payablesController.getAccountLedger);

// Suppliers Routes (Protected with authentication)
router.get('/suppliers', authenticateToken, suppliersController.getAllSuppliers);
router.get('/suppliers/:id', authenticateToken, suppliersController.getSupplierById);
router.post('/suppliers', authenticateToken, suppliersController.createSupplier);
router.put('/suppliers/:id', authenticateToken, suppliersController.updateSupplier);
router.delete('/suppliers/:id', authenticateToken, suppliersController.deleteSupplier);

// Customers Routes (Protected with authentication)
router.get('/customers', authenticateToken, customersController.getAllCustomers);
router.get('/customers/:id', authenticateToken, customersController.getCustomerById);
router.post('/customers', authenticateToken, customersController.createCustomer);
router.put('/customers/:id', authenticateToken, customersController.updateCustomer);
router.delete('/customers/:id', authenticateToken, customersController.deleteCustomer);

// Products Routes (Protected with authentication)
router.get('/products', authenticateToken, productsController.getAllProducts);
router.get('/products/:id', authenticateToken, productsController.getProductById);
router.post('/products', authenticateToken, uploadProductImageMulter.single('image'), createProduct);
router.put('/products/:id', authenticateToken, productsController.updateProduct);
router.delete('/products/:id', authenticateToken, productsController.deleteProduct);
router.post('/products/:id/image', authenticateToken, uploadProductImageMulter.single('image'), uploadProductImage);
router.get('/products/low-stock', authenticateToken, productsController.getLowStockProducts);

// Dashboard Routes (Protected with authentication)
router.get('/dashboard/stats', authenticateToken, dashboardController.getDashboardStats);
router.get('/dashboard/executive-stats', authenticateToken, dashboardController.getExecutiveDashboardStats);

// Purchase Orders Routes (Protected with authentication)
router.get('/purchase-orders', authenticateToken, purchaseOrderController.getAllPurchaseOrders);
router.get('/purchase-orders/:id', authenticateToken, purchaseOrderController.getPurchaseOrderById);
router.get('/purchase-orders/:id/with-receipts', authenticateToken, purchaseOrderController.getPurchaseOrderWithReceipts);
router.post('/purchase-orders', authenticateToken, purchaseOrderController.createPurchaseOrder);
router.put('/purchase-orders/:id', authenticateToken, purchaseOrderController.updatePurchaseOrder);
router.delete('/purchase-orders/:id', authenticateToken, purchaseOrderController.deletePurchaseOrder);
router.patch('/purchase-orders/:id/status', authenticateToken, purchaseOrderController.updateStatus);
router.post('/purchase-orders/:purchaseOrderId/receive', authenticateToken, purchaseOrderController.receiveItems);

// Sales Orders Routes (Protected with authentication)
router.get('/sales-orders', authenticateToken, salesOrderController.getAllSalesOrders);
router.get('/sales-orders-all', authenticateToken, salesOrderController.getAllSalesOrdersIncludingDrafts);
router.get('/sales-orders/current-month-data', authenticateToken, salesOrderController.getCurrentMonthSalesData);
router.get('/sales-orders/category-performance', authenticateToken, salesOrderController.getCategoryPerformanceData);
router.post('/sales-orders', authenticateToken, (req, res, next) => {
  console.log('=== SALES ORDERS ROUTE HIT ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
}, salesOrderController.createSalesOrder);

// Specific sales order routes (must come before general :id routes)
router.get('/sales-orders/:id/items', authenticateToken, salesOrderController.getSalesOrderItems);
router.post('/sales-orders/:id/receive-back', authenticateToken, salesOrderController.receiveBackToStock);
router.post('/sales-orders/:id/convert-to-invoice', authenticateToken, salesOrderController.convertToInvoice);
router.post('/sales-orders/:id/complete-delivery', authenticateToken, async (req, res) => {
  console.log('Complete delivery route hit:', req.params, req.body);
  
  try {
    const { id } = req.params;
    const { recipient_name, recipient_phone, notes, delivery_image_filename } = req.body;
    
    console.log('Processing delivery completion for order:', id);
    console.log('Delivery image filename:', delivery_image_filename);
    
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
          delivery_image = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [`Delivered to: ${recipient_name} (${recipient_phone}). ${notes || ''}`, delivery_image_filename || null, id]);

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
router.get('/sales-orders/:id', authenticateToken, salesOrderController.getSalesOrderById);
router.put('/sales-orders/:id', authenticateToken, salesOrderController.updateSalesOrder);
router.delete('/sales-orders/:id', authenticateToken, salesOrderController.deleteSalesOrder);
router.patch('/sales-orders/:id', authenticateToken, salesOrderController.assignRider);

// Add POST route for uploading delivery images (Protected with authentication)
router.post('/upload-delivery-image', authenticateToken, uploadProductImageMulter.single('delivery_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { order_id, recipient_name, recipient_phone, notes } = req.body;
    
    if (!order_id || !recipient_name || !recipient_phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Convert buffer to base64 for Cloudinary
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'delivery_images',
        public_id: `delivery_${order_id}_${Date.now()}`,
        resource_type: 'auto'
      });

      res.json({ 
        success: true, 
        message: 'Delivery image uploaded successfully',
        filename: result.secure_url,
        order_id,
        recipient_name,
        recipient_phone,
        notes
      });
    } catch (cloudinaryError) {
      console.error('Cloudinary upload error:', cloudinaryError);
      // Fallback to local storage if Cloudinary fails
      res.json({ 
        success: true, 
        message: 'Delivery image uploaded successfully (local storage)',
        filename: req.file.filename,
        order_id,
        recipient_name,
        recipient_phone,
        notes
      });
    }
  } catch (error) {
    console.error('Error uploading delivery image:', error);
    res.status(500).json({ error: 'Failed to upload delivery image' });
  }
});



// Stores Routes (Protected with authentication)
router.get('/stores', authenticateToken, storeController.getAllStores);
router.get('/stores/:id', authenticateToken, storeController.getStoreById);
router.get('/stores/:storeId/inventory', authenticateToken, storeController.getStoreInventory);
router.get('/stores-inventory', authenticateToken, storeController.getAllStoresInventory);
router.get('/inventory-summary', authenticateToken, storeController.getInventorySummaryByStore);
router.get('/stock-summary', authenticateToken, storeController.getStockSummary);
router.get('/inventory/in-transit', authenticateToken, storeController.getInTransitProducts);

// Payables Routes (Protected with authentication)
router.get('/payables/aging', authenticateToken, payablesController.getAgingPayables);
router.post('/payables/payment', authenticateToken, payablesController.makeSupplierPayment);
router.post('/payables/confirm-payment', authenticateToken, payablesController.confirmSupplierPayment);
router.get('/payments', authenticateToken, payablesController.listPayments);
router.get('/suppliers/:id/ledger', authenticateToken, payablesController.getSupplierLedger);
router.post('/suppliers/:id/pay', authenticateToken, payablesController.paySupplier);

// Invoice Routes (Protected with authentication)
router.get('/invoices', authenticateToken, invoiceController.getAllInvoices);
router.get('/invoices/:id', authenticateToken, invoiceController.getInvoiceById);
router.post('/invoices', authenticateToken, invoiceController.createInvoice);
router.get('/customers/:id/ledger', authenticateToken, invoiceController.getCustomerLedger);

// Receivables Routes (Protected with authentication)
router.get('/receivables/aging', authenticateToken, receivablesController.getAgingReceivables);
router.post('/receivables/payment', authenticateToken, receivablesController.makeCustomerPayment);
router.post('/receivables/confirm-payment', authenticateToken, receivablesController.confirmCustomerPayment);
router.get('/receipts', authenticateToken, receivablesController.listReceipts);
router.get('/receipts/invoice/:invoice_id/pending', authenticateToken, receivablesController.getPendingReceiptsForInvoice);
router.get('/receipts/invoice/:invoice_id', authenticateToken, receivablesController.getReceiptsByInvoice);
router.post('/receipts/bulk-amounts-paid', authenticateToken, receivablesController.getBulkAmountsPaid);
router.get('/clients/:clientId/outstanding-balance', authenticateToken, receivablesController.getClientOutstandingBalance);
router.put('/receipts/:id/confirm', authenticateToken, receivablesController.confirmPayment);
router.put('/receipts/:id/decline', authenticateToken, receivablesController.declinePayment);

// Reports Routes
router.get('/reports/profit-loss', authenticateToken, reportsController.getProfitLossReport);
router.get('/reports/balance-sheet', authenticateToken, reportsController.getBalanceSheetReport);
router.get('/reports/cash-flow', authenticateToken, reportsController.getCashFlowReport);
router.get('/reports/trial-balance', authenticateToken, reportsController.getTrialBalanceReport);
router.get('/reports/product-performance', authenticateToken, reportsController.getProductPerformanceReport);
router.get('/reports/cost-of-goods-sold-details', authenticateToken, reportsController.getCostOfGoodsSoldDetails);
router.get('/reports/sales-revenue-details', authenticateToken, reportsController.getSalesRevenueDetails);
router.get('/reports/gross-margin-details', authenticateToken, reportsController.getGrossMarginDetails);
router.get('/reports/sales-tax', authenticateToken, reportsController.getSalesTaxReport);
router.get('/reports/categories', authenticateToken, reportsController.getAllCategories);
router.get('/products-sale-report', authenticateToken, getProductsSaleReport);
router.get('/journal-entry-lines/:account_id', authenticateToken, reportsController.getJournalEntriesForAccount);
router.get('/journal-entries/invoice/:invoice_id', authenticateToken, reportsController.getJournalEntriesForInvoice);

// Cash and Equivalents Route (Protected with authentication)
router.get('/cash-equivalents', authenticateToken, getCashAndEquivalents);
router.get('/cash-equivalents/accounts', authenticateToken, getAllCashAccounts);
router.post('/cash-equivalents/opening-balance', authenticateToken, setOpeningBalance);
router.get('/cash-equivalents/accounts/:account_id/ledger', authenticateToken, getCashAccountLedger);

// Expenses Route (Protected with authentication)
router.post('/expenses', authenticateToken, postExpense);
router.get('/expenses', authenticateToken, getAllExpenses);
router.get('/expense-summary', authenticateToken, getExpenseSummary);
router.get('/expenses/:journal_entry_id/items', authenticateToken, getExpenseItems);
router.get('/expenses/:journal_entry_id/invoice', authenticateToken, getExpenseInvoice);
router.post('/expenses/:journal_entry_id/payments', authenticateToken, createExpensePayment);
router.get('/expense-payments/pending', authenticateToken, getPendingExpensePayments);
router.put('/expense-payments/:id/status', authenticateToken, updateExpensePaymentStatus);

// Journal Entries Route (Protected with authentication)
router.get('/journal-entries/:id', authenticateToken, getJournalEntryById);

// Asset management (Protected with authentication)
router.get('/asset-types', authenticateToken, getAssetTypes);
router.get('/asset-accounts', authenticateToken, getAssetAccounts);
router.get('/depreciation-accounts', authenticateToken, getDepreciationAccounts);
router.get('/depreciation-history', authenticateToken, getDepreciationHistory);
router.post('/assets', authenticateToken, addAsset);
router.get('/assets', authenticateToken, getAssets);
router.post('/depreciation', authenticateToken, postDepreciation);
router.get('/assets-with-depreciation', authenticateToken, getAllAssetsWithDepreciation);
router.get('/assets-total-value', authenticateToken, getAssetsTotalValue);

router.post('/equity-entries', authenticateToken, addEquityEntry);
router.get('/equity-entries', authenticateToken, listEquityEntries);
router.post('/equity-entries/bulk', authenticateToken, addBulkEquityEntries);

// Journal entries route (Protected with authentication)
router.get('/journal-entries', authenticateToken, reportsController.listJournalEntries);
router.post('/journal-entries', authenticateToken, createJournalEntry);

// General Ledger Report (Protected with authentication)
router.get('/general-ledger', authenticateToken, reportsController.getGeneralLedger);

// Inventory Transactions (Protected with authentication)
router.get('/inventory-transactions', authenticateToken, storeController.getInventoryTransactions);

// Inventory as of date (Protected with authentication)
router.get('/inventory-as-of', authenticateToken, storeController.getInventoryAsOfDate);

// Stock Transfer (Protected with authentication)
router.post('/stock-transfer', authenticateToken, storeController.recordStockTransfer);
router.get('/transfer-history', authenticateToken, storeController.getTransferHistory);
router.post('/stock-take', authenticateToken, storeController.recordStockTake);
router.get('/stock-take-history', authenticateToken, storeController.getStockTakeHistory);
router.get('/stock-take/:stock_take_id/items', authenticateToken, storeController.getStockTakeItems);
router.post('/stores/update-stock-quantity', authenticateToken, storeController.updateStockQuantity);

// Receive to Stock from Cancelled Orders (Protected with authentication)
router.post('/receive-to-stock', authenticateToken, storeController.receiveToStockFromOrder);

router.get('/categories', authenticateToken, getAllCategories);
router.post('/categories', authenticateToken, addCategory);
router.put('/categories/:id', authenticateToken, updateCategory);
router.delete('/categories/:id', authenticateToken, deleteCategory);
router.get('/categories/:id/price-options', authenticateToken, getCategoryPriceOptions);
router.post('/categories/:id/price-options', authenticateToken, addCategoryPriceOption);
router.put('/price-options/:id', authenticateToken, updateCategoryPriceOption);
router.delete('/price-options/:id', authenticateToken, deleteCategoryPriceOption);

router.get('/sales-reps', authenticateToken, getSalesReps);

// Credit Notes Routes (Protected with authentication)
router.get('/credit-notes', authenticateToken, creditNoteController.getAllCreditNotes);
router.get('/credit-notes/:id', authenticateToken, creditNoteController.getCreditNoteById);
router.post('/credit-notes', authenticateToken, creditNoteController.createCreditNote);
router.post('/credit-notes/receive-back', authenticateToken, creditNoteController.receiveBackToStock);
router.get('/customers/:customerId/invoices-for-credit', authenticateToken, creditNoteController.getCustomerInvoices);
router.get('/customers/:customerId/credit-notes', authenticateToken, creditNoteController.getCustomerCreditNotes);

module.exports = router; 