-- Update all products to have reorder_level = 1500
-- This script sets the reorder level for all active products to 1500

UPDATE products 
SET reorder_level = 1500 
WHERE is_active = true;

-- Verify the update
SELECT 
    id,
    product_code,
    product_name,
    reorder_level,
    is_active
FROM products
WHERE is_active = true
ORDER BY product_name
LIMIT 20;

-- Count products updated
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN reorder_level = 1500 THEN 1 END) as products_with_reorder_1500,
    COUNT(CASE WHEN reorder_level != 1500 THEN 1 END) as products_with_different_reorder
FROM products
WHERE is_active = true;

