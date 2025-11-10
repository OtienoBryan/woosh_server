-- Add scenario_type and damage_store_id fields to credit_notes table
-- This supports two scenarios:
-- Scenario 1: Faulty products (no stock return) - Dr. Damages/faulty account, Dr. Sales VAT, Cr. Debtors
-- Scenario 2: Expired/damaged/faulty products from stock - Dr. Faulty account, Cr. Store, Cr. Cost of sale

ALTER TABLE credit_notes 
ADD COLUMN scenario_type ENUM('faulty_no_stock', 'faulty_with_stock') DEFAULT 'faulty_no_stock' AFTER reason,
ADD COLUMN damage_store_id INT NULL AFTER scenario_type,
ADD INDEX idx_scenario_type (scenario_type),
ADD INDEX idx_damage_store_id (damage_store_id),
ADD FOREIGN KEY (damage_store_id) REFERENCES stores(id) ON DELETE SET NULL;

