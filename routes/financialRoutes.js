const express = require('express');
const router = express.Router();
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
  postDepreciation
} = require('../controllers/financialController');
const purchaseOrderController = require('../controllers/purchaseOrderController');
const storeController = require('../controllers/storeController');
const payablesController = require('../controllers/payablesController');
const invoiceController = require('../controllers/invoiceController');
const receivablesController = require('../controllers/receivablesController');
const reportsController = require('../controllers/reportsController');
const salesOrderController = require('../controllers/salesOrderController');

// Chart of Accounts Routes
router.get('/accounts', chartOfAccountsController.getAllAccounts);
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
router.post('/products', productsController.createProduct);
router.put('/products/:id', productsController.updateProduct);
router.delete('/products/:id', productsController.deleteProduct);
router.get('/products/low-stock', productsController.getLowStockProducts);

// Dashboard Routes
router.get('/dashboard/stats', dashboardController.getDashboardStats);

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
router.get('/sales-orders/:id', salesOrderController.getSalesOrderById);
router.post('/sales-orders', salesOrderController.createSalesOrder);
router.put('/sales-orders/:id', salesOrderController.updateSalesOrder);
router.delete('/sales-orders/:id', salesOrderController.deleteSalesOrder);

// Stores Routes
router.get('/stores', storeController.getAllStores);
router.get('/stores/:id', storeController.getStoreById);
router.get('/stores/:storeId/inventory', storeController.getStoreInventory);
router.get('/stores-inventory', storeController.getAllStoresInventory);
router.get('/inventory-summary', storeController.getInventorySummaryByStore);

// Payables Routes
router.get('/payables/aging', payablesController.getAgingPayables);
router.post('/payables/payment', payablesController.makeSupplierPayment);
router.post('/payables/confirm-payment', payablesController.confirmSupplierPayment);
router.get('/payments', payablesController.listPayments);

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

// Reports Routes
router.get('/reports/profit-loss', reportsController.getProfitLossReport);
router.get('/reports/balance-sheet', reportsController.getBalanceSheetReport);
router.get('/reports/cash-flow', reportsController.getCashFlowReport);
router.get('/journal-entry-lines/:account_id', reportsController.getJournalEntriesForAccount);

// Expenses Route
router.post('/expenses', require('../controllers/financialController').postExpense);

// Asset management
router.get('/asset-types', getAssetTypes);
router.get('/asset-accounts', getAssetAccounts);
router.post('/assets', addAsset);
router.get('/assets', getAssets);
router.post('/depreciation', postDepreciation);

router.post('/equity-entries', require('../controllers/financialController').addEquityEntry);
router.get('/equity-entries', require('../controllers/financialController').listEquityEntries);

module.exports = router; 