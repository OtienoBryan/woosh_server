const connection = require('../database/db');

const supplierController = {
  // Get all suppliers
  getAllSuppliers: async (req, res) => {
    try {
      const [suppliers] = await connection.query(`
        SELECT id, supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, created_at, updated_at
        FROM suppliers
        ORDER BY company_name ASC
      `);

      res.json({
        success: true,
        data: suppliers
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch suppliers'
      });
    }
  },

  // Get supplier by ID
  getSupplierById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const [suppliers] = await connection.query(`
        SELECT id, supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, created_at, updated_at
        FROM suppliers
        WHERE id = ?
      `, [id]);

      if (suppliers.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        data: suppliers[0]
      });
    } catch (error) {
      console.error('Error fetching supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supplier'
      });
    }
  },

  // Create new supplier
  createSupplier: async (req, res) => {
    try {
      const { supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms } = req.body;

      if (!company_name) {
        return res.status(400).json({
          success: false,
          error: 'Company name is required'
        });
      }

      const [result] = await connection.query(`
        INSERT INTO suppliers (supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms]);

      const [newSupplier] = await connection.query(`
        SELECT id, supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, created_at, updated_at
        FROM suppliers
        WHERE id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        data: newSupplier[0]
      });
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create supplier'
      });
    }
  },

  // Update supplier
  updateSupplier: async (req, res) => {
    try {
      const { id } = req.params;
      const { supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms } = req.body;

      if (!company_name) {
        return res.status(400).json({
          success: false,
          error: 'Company name is required'
        });
      }

      const [result] = await connection.query(`
        UPDATE suppliers
        SET supplier_code = ?, company_name = ?, contact_person = ?, email = ?, phone = ?, address = ?, tax_id = ?, payment_terms = ?, updated_at = NOW()
        WHERE id = ?
      `, [supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      const [updatedSupplier] = await connection.query(`
        SELECT id, supplier_code, company_name, contact_person, email, phone, address, tax_id, payment_terms, created_at, updated_at
        FROM suppliers
        WHERE id = ?
      `, [id]);

      res.json({
        success: true,
        data: updatedSupplier[0]
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update supplier'
      });
    }
  },

  // Delete supplier
  deleteSupplier: async (req, res) => {
    try {
      const { id } = req.params;

      const [result] = await connection.query(`
        DELETE FROM suppliers
        WHERE id = ?
      `, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Supplier not found'
        });
      }

      res.json({
        success: true,
        message: 'Supplier deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete supplier'
      });
    }
  }
};

module.exports = supplierController; 