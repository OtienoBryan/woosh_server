-- Create document_categories table
CREATE TABLE IF NOT EXISTS document_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO document_categories (name, description, color) VALUES
('Contract', 'Legal contracts and agreements', '#3B82F6'),
('Agreement', 'Business agreements and partnerships', '#10B981'),
('Invoice', 'Financial invoices and billing documents', '#8B5CF6'),
('Report', 'Business reports and analytics', '#F59E0B'),
('Policy', 'Company policies and procedures', '#EF4444'),
('Other', 'Miscellaneous documents', '#6B7280')
ON DUPLICATE KEY UPDATE name=name;

-- Add foreign key constraint to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_id INT NULL;
ALTER TABLE documents ADD CONSTRAINT fk_document_category FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Update existing documents to use category_id instead of category string
UPDATE documents d 
SET d.category_id = (
    SELECT dc.id 
    FROM document_categories dc 
    WHERE dc.name = d.category
) 
WHERE d.category IS NOT NULL;
