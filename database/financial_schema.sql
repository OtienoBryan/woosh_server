-- Retail Financial Management System Database Schema

-- Users and Authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'manager', 'accountant', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Chart of Accounts
CREATE TABLE chart_of_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type INT NOT NULL, -- 1=asset, 2=liability, 13=equity, 17=depreciation, etc.
    parent_account_id INT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
);

-- Suppliers
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_code VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms INT DEFAULT 30, -- days
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_code VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms INT DEFAULT 30, -- days
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products/Inventory Items
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_code VARCHAR(20) UNIQUE NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    unit_of_measure VARCHAR(20) DEFAULT 'PCS',
    cost_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    reorder_level INT DEFAULT 0,
    current_stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Purchase Orders
CREATE TABLE purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(20) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status ENUM('draft', 'sent', 'received', 'cancelled') DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    purchase_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    received_quantity INT DEFAULT 0,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sales Orders
CREATE TABLE sales_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    so_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    sales_rep_id INT,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'draft',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    my_status TINYINT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sales_rep_id) REFERENCES SalesRep(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Sales Order Items
CREATE TABLE sales_order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sales_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    shipped_quantity INT DEFAULT 0,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Receipts (Cash/Check Receipts)
CREATE TABLE receipts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_number VARCHAR(20) UNIQUE NOT NULL,
    client_id INT NOT NULL,
    receipt_date DATE NOT NULL,
    payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card') NOT NULL,
    reference VARCHAR(50),
    invoice_number VARCHAR(50),
    amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    account_id INT,
    status ENUM('in pay', 'confirmed', 'cancelled') DEFAULT 'in pay',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Payments (Supplier Payments)
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_number VARCHAR(20) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card') NOT NULL,
    reference_number VARCHAR(50),
    amount DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Supplier Ledger (tracks supplier account balances)
CREATE TABLE supplier_ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(20) NOT NULL, -- 'purchase_order', 'payment', etc.
    reference_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    running_balance DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Customer Ledger (tracks customer account balances)
CREATE TABLE customer_ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(20) NOT NULL, -- 'sales_order', 'receipt', etc.
    reference_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    running_balance DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Account Ledger (tracks account balances)
CREATE TABLE account_ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(20) NOT NULL, -- 'payment', 'receipt', etc.
    reference_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    running_balance DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'in pay', 'confirmed', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

-- Journal Entries
CREATE TABLE journal_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entry_number VARCHAR(20) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    reference VARCHAR(100),
    description TEXT,
    total_debit DECIMAL(15,2) DEFAULT 0,
    total_credit DECIMAL(15,2) DEFAULT 0,
    status ENUM('draft', 'posted', 'cancelled') DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Journal Entry Lines
CREATE TABLE journal_entry_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    journal_entry_id INT NOT NULL,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id),
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

-- Inventory Transactions
CREATE TABLE inventory_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_number VARCHAR(20) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    transaction_type ENUM('purchase', 'sale', 'adjustment', 'transfer') NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(15,2),
    reference_id INT, -- PO ID, SO ID, etc.
    reference_type VARCHAR(20), -- 'purchase_order', 'sales_order', etc.
    transaction_date DATE NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Company Assets (linked to Chart of Accounts)
-- Migration: If you have existing assets, migrate asset_type_id to the correct account_id, then drop asset_type_id
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  purchase_date DATE NOT NULL,
  purchase_value DECIMAL(15,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

-- Remove asset_types table if it exists
DROP TABLE IF EXISTS asset_types;

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type, description) VALUES
-- Assets (type 1)
('1000', 'Cash', 1, 'Cash on hand and in bank'),
('1100', 'Accounts Receivable', 1, 'Amounts owed by customers'),
('110000', 'Debtors Control Account', 1, 'Control account for customer receivables'),
('1200', 'Inventory', 1, 'Merchandise inventory'),
('1300', 'Prepaid Expenses', 1, 'Prepaid insurance, rent, etc.'),
('1400', 'Fixed Assets', 1, 'Equipment, furniture, vehicles'),
('1500', 'Accumulated Depreciation', 1, 'Accumulated depreciation on fixed assets'),

-- Liabilities (type 2)
('2000', 'Accounts Payable', 2, 'Amounts owed to suppliers'),
('2100', 'Accrued Expenses', 2, 'Accrued wages, taxes, etc.'),
('2200', 'Notes Payable', 2, 'Bank loans and notes'),
('2300', 'Sales Tax Payable', 2, 'Sales tax collected'),

-- Equity (type 13)
('3000', 'Owner\'s Equity', 13, 'Owner\'s investment'),
('3100', 'Retained Earnings', 13, 'Accumulated profits'),
('3200', 'Owner\'s Draw', 13, 'Owner\'s withdrawals'),

-- Revenue (type 4)
('4000', 'Sales Revenue', 4, 'Revenue from sales'),
('4100', 'Other Income', 4, 'Interest, rent, etc.'),

-- Expenses (type 5)
('5000', 'Cost of Goods Sold', 5, 'Cost of merchandise sold'),
('5100', 'Advertising Expense', 5, 'Marketing and advertising costs'),
('5200', 'Rent Expense', 5, 'Store and office rent'),
('5300', 'Utilities Expense', 5, 'Electricity, water, internet'),
('5400', 'Wages Expense', 5, 'Employee salaries and wages'),
('5500', 'Insurance Expense', 5, 'Business insurance'),
('5600', 'Office Supplies', 5, 'Office and store supplies'),
('5800', 'Miscellaneous Expense', 5, 'Other business expenses'),

-- Depreciation (type 17)
('5700', 'Depreciation Expense', 17, 'Depreciation on fixed assets');

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@retailfinance.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin'); 

-- Employee Contracts
CREATE TABLE IF NOT EXISTS employee_contracts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  renewed_from INT DEFAULT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (renewed_from) REFERENCES employee_contracts(id)
);

-- Termination Letters
CREATE TABLE IF NOT EXISTS termination_letters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  termination_date DATE NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Warning Letters
CREATE TABLE IF NOT EXISTS warning_letters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  warning_date DATE NOT NULL,
  warning_type VARCHAR(50) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
); 

-- Employee Warnings
CREATE TABLE IF NOT EXISTS employee_warnings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staff_id INT NOT NULL,
  message TEXT NOT NULL,
  issued_by VARCHAR(100),
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
); 

-- Stock Takes (Physical Inventory Counts)
CREATE TABLE IF NOT EXISTS stock_takes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  staff_id INT NOT NULL,
  take_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (staff_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_take_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_take_id INT NOT NULL,
  product_id INT NOT NULL,
  system_quantity INT NOT NULL,
  counted_quantity INT NOT NULL,
  difference INT NOT NULL,
  FOREIGN KEY (stock_take_id) REFERENCES stock_takes(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
); 

-- Countries Table
CREATE TABLE IF NOT EXISTS countries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

-- Regions Table
CREATE TABLE IF NOT EXISTS regions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  country_id INT,
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

-- Routes Table
CREATE TABLE IF NOT EXISTS routes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
); 

-- Clients Table
CREATE TABLE IF NOT EXISTS Clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  email VARCHAR(100),
  phone VARCHAR(20),
  country_id INT,
  region_id INT,
  route_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id),
  FOREIGN KEY (region_id) REFERENCES regions(id),
  FOREIGN KEY (route_id) REFERENCES routes(id)
); 

-- HR Calendar Tasks
CREATE TABLE IF NOT EXISTS hr_calendar_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('Pending','In Progress','Completed') DEFAULT 'Pending',
  assigned_to VARCHAR(100),
  text TEXT
); 

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_id INT(11) NOT NULL,
    leave_type_id INT(11) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_half_day TINYINT(1) NOT NULL DEFAULT 0,
    reason VARCHAR(255) DEFAULT NULL,
    attachment_url VARCHAR(255) DEFAULT NULL,
    status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    approved_by INT(11) DEFAULT NULL,
    employee_type_id INT(11) NOT NULL DEFAULT 1,
    notes TEXT DEFAULT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    KEY idx_employee_id (employee_id),
    KEY idx_leave_type_id (leave_type_id),
    KEY idx_start_date (start_date),
    KEY idx_end_date (end_date),
    KEY idx_status (status),
    KEY idx_approved_by (approved_by),
    KEY idx_created_at (created_at),
    
    CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES staff(id),
    CONSTRAINT fk_leave_requests_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
); 

-- Visibility Report Table
CREATE TABLE IF NOT EXISTS VisibilityReport (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reportId INT(11) NOT NULL UNIQUE,
  comment VARCHAR(191) DEFAULT NULL,
  imageUrl VARCHAR(191) DEFAULT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  clientId INT(11) NOT NULL,
  userId INT(11) NOT NULL
); 

-- My Visibility Report Table
CREATE TABLE IF NOT EXISTS MyVisibilityReport (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reportId INT(11) NOT NULL UNIQUE,
  comment VARCHAR(191) DEFAULT NULL,
  imageUrl VARCHAR(191) DEFAULT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  clientId INT(11) NOT NULL,
  userId INT(11) NOT NULL
); 