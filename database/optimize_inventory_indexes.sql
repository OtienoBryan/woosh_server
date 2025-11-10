-- Database Indexes for Inventory Performance Optimization
-- Run this file to add indexes that will significantly improve query performance

-- Indexes for stores table
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_stores_store_code ON stores(store_code);

-- Indexes for store_inventory table (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_store_inventory_store_id ON store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_product_id ON store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_store_product ON store_inventory(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_quantity ON store_inventory(quantity);

-- Indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

-- Indexes for sales_orders table (for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_sales_orders_my_status ON sales_orders(my_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_date ON sales_orders(my_status, order_date);

-- Indexes for sales_order_items table
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product_id ON sales_order_items(product_id);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_store_inventory_composite ON store_inventory(store_id, product_id, quantity);

-- Indexes for inventory_transfers table (for transfer history queries)
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_from_store ON inventory_transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_to_store ON inventory_transfers(to_store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_product ON inventory_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_date ON inventory_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_staff ON inventory_transfers(staff_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_date_desc ON inventory_transfers(transfer_date DESC, id DESC);

-- Analyze tables to update statistics (helps query optimizer)
ANALYZE TABLE stores;
ANALYZE TABLE store_inventory;
ANALYZE TABLE products;
ANALYZE TABLE sales_orders;
ANALYZE TABLE sales_order_items;
ANALYZE TABLE inventory_transfers;

