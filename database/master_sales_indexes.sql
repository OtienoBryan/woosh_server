-- Performance Indexes for Master Sales Query Optimization
-- Run these indexes to dramatically improve Master Sales page performance

-- Index on sales_orders for filtering by status, client, and date
CREATE INDEX IF NOT EXISTS idx_sales_orders_client_status_date 
ON sales_orders(client_id, my_status, order_date);

-- Index for year filtering on sales_orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_year_month 
ON sales_orders(YEAR(order_date), MONTH(order_date), my_status);

-- Index on sales_order_items for faster joins
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_product 
ON sales_order_items(sales_order_id, product_id);

-- Index on products for category lookups
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category_id, id);

-- Index on Clients for faster client lookups and sorts
CREATE INDEX IF NOT EXISTS idx_clients_name 
ON Clients(name);

-- Index on sales orders for client activity checks  
CREATE INDEX IF NOT EXISTS idx_sales_orders_activity 
ON sales_orders(client_id, order_date, my_status);

-- Composite index for SalesRep joins
CREATE INDEX IF NOT EXISTS idx_clients_route_update 
ON Clients(route_id_update);

CREATE INDEX IF NOT EXISTS idx_salesrep_route_update 
ON SalesRep(route_id_update);

-- Index for ORDER BY optimization
CREATE INDEX IF NOT EXISTS idx_clients_name_id 
ON Clients(name, id);

-- Covering index for COUNT queries
CREATE INDEX IF NOT EXISTS idx_sales_orders_cover 
ON sales_orders(client_id, my_status, order_date, id);

-- To check existing indexes:
-- SHOW INDEX FROM sales_orders;
-- SHOW INDEX FROM sales_order_items;
-- SHOW INDEX FROM Clients;
-- SHOW INDEX FROM products;

-- To analyze query performance after adding indexes:
-- EXPLAIN SELECT ... (your query here)

-- To check index usage:
-- SHOW STATUS LIKE 'Handler_read%';

