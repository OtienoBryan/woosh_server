const db = require('../database/db');

const assetPurchaseOrderController = {
  // Get all asset purchase orders
  getAllAssetPurchaseOrders: async (req, res) => {
    try {
      const { supplier_id, status } = req.query;
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (supplier_id) {
        whereClause += ' AND apo.supplier_id = ?';
        params.push(supplier_id);
      }

      if (status) {
        whereClause += ' AND apo.status = ?';
        params.push(status);
      }

      const [orders] = await db.query(`
        SELECT 
          apo.*,
          s.company_name as supplier_name,
          s.supplier_code as supplier_code,
          COUNT(apoi.id) as item_count
        FROM asset_purchase_orders apo
        LEFT JOIN suppliers s ON apo.supplier_id = s.id
        LEFT JOIN asset_purchase_order_items apoi ON apo.id = apoi.asset_purchase_order_id
        ${whereClause}
        GROUP BY apo.id
        ORDER BY apo.created_at DESC
      `, params);

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error fetching asset purchase orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset purchase orders'
      });
    }
  },

  // Get asset purchase order by ID with items
  getAssetPurchaseOrderById: async (req, res) => {
    try {
      const { id } = req.params;

      const [orders] = await db.query(`
        SELECT 
          apo.*,
          s.company_name as supplier_name,
          s.supplier_code as supplier_code,
          s.address as supplier_address,
          s.tax_id as supplier_tax_id
        FROM asset_purchase_orders apo
        LEFT JOIN suppliers s ON apo.supplier_id = s.id
        WHERE apo.id = ?
      `, [id]);

      if (orders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Asset purchase order not found'
        });
      }

      const [items] = await db.query(`
        SELECT 
          apoi.*,
          ma.asset_code,
          ma.asset_name,
          ma.asset_type
        FROM asset_purchase_order_items apoi
        LEFT JOIN my_assets ma ON apoi.asset_id = ma.id
        WHERE apoi.asset_purchase_order_id = ?
        ORDER BY apoi.id
      `, [id]);

      res.json({
        success: true,
        data: {
          ...orders[0],
          items
        }
      });
    } catch (error) {
      console.error('Error fetching asset purchase order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset purchase order'
      });
    }
  },

  // Create new asset purchase order
  createAssetPurchaseOrder: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      console.log('=== Starting asset purchase order creation ===');
      await connection.beginTransaction();
      
      const { 
        supplier_id, 
        order_date, 
        expected_delivery_date, 
        notes, 
        assets 
      } = req.body;

      console.log('Request body:', { supplier_id, order_date, expected_delivery_date, notes, assetsCount: assets?.length });

      // Generate APO number
      const [apoCount] = await connection.query('SELECT COUNT(*) as count FROM asset_purchase_orders');
      const apoNumber = `APO-${String(apoCount[0].count + 1).padStart(6, '0')}`;
      console.log('Generated APO number:', apoNumber);

      // Helper function to get tax rate
      const getTaxRate = (taxType) => {
        if (taxType === '16%') return 0.16;
        return 0; // zero_rated and exempted
      };

      // Calculate totals with tax
      let subtotal = 0;
      let totalTax = 0;
      
      for (const asset of assets) {
        const lineSubtotal = asset.unit_price * asset.quantity;
        const taxRate = getTaxRate(asset.tax_type || '16%');
        const lineTax = lineSubtotal * taxRate;
        
        console.log(`Asset ${asset.asset_id}: subtotal=${lineSubtotal}, tax_rate=${taxRate}, tax=${lineTax}`);
        
        subtotal += lineSubtotal;
        totalTax += lineTax;
      }
      
      const totalAmount = subtotal + totalTax;
      console.log('Totals: subtotal=', subtotal, 'tax=', totalTax, 'total=', totalAmount);

      // Create asset purchase order
      console.log('Creating asset purchase order...');
      const [apoResult] = await connection.query(`
        INSERT INTO asset_purchase_orders (
          apo_number, supplier_id, order_date, expected_delivery_date, 
          subtotal, tax_amount, total_amount, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [apoNumber, supplier_id, order_date, expected_delivery_date, subtotal, totalTax, totalAmount, notes, 1]);

      const assetPurchaseOrderId = apoResult.insertId;
      console.log('Created asset purchase order with ID:', assetPurchaseOrderId);

      // Create asset purchase order items
      console.log('Creating asset purchase order items...');
      for (const asset of assets) {
        const lineSubtotal = asset.unit_price * asset.quantity;
        const taxRate = getTaxRate(asset.tax_type || '16%');
        const lineTax = lineSubtotal * taxRate;
        const totalPrice = lineSubtotal + lineTax;
        
        console.log(`Inserting item: asset_id=${asset.asset_id}, quantity=${asset.quantity}, unit_price=${asset.unit_price}, tax_type=${asset.tax_type || '16%'}, tax_amount=${lineTax}, total_price=${totalPrice}`);
        
        await connection.query(`
          INSERT INTO asset_purchase_order_items (
            asset_purchase_order_id, asset_id, quantity, unit_price, total_price, tax_type, tax_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [assetPurchaseOrderId, asset.asset_id, asset.quantity, asset.unit_price, totalPrice, asset.tax_type || '16%', lineTax]);
      }

      console.log('Committing transaction...');
      await connection.commit();

      // Get the created purchase order
      const [createdAPO] = await connection.query(`
        SELECT 
          apo.*,
          s.company_name as supplier_name,
          s.supplier_code as supplier_code,
          s.address as supplier_address,
          s.tax_id as supplier_tax_id
        FROM asset_purchase_orders apo
        LEFT JOIN suppliers s ON apo.supplier_id = s.id
        WHERE apo.id = ?
      `, [assetPurchaseOrderId]);

      console.log('=== Asset purchase order created successfully ===');
      res.status(201).json({ 
        success: true, 
        data: createdAPO[0],
        message: 'Asset purchase order created successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating asset purchase order:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to create asset purchase order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      connection.release();
    }
  },

  // Update status
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await db.query(`
        UPDATE asset_purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, id]);

      res.json({
        success: true,
        message: 'Asset purchase order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating asset purchase order status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update asset purchase order status'
      });
    }
  },

  // Receive assets (process the purchase order and create my_assets entries)
  receiveAssets: async (req, res) => {
    const connection = await db.getConnection();
    
    try {
      console.log('=== Starting receive assets ===');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      await connection.beginTransaction();
      
      const { assetPurchaseOrderId } = req.params;
      const { location, notes } = req.body;

      console.log('Receiving assets for PO:', assetPurchaseOrderId, 'location:', location);

      // Verify asset purchase order exists
      const [apos] = await connection.query(
        'SELECT * FROM asset_purchase_orders WHERE id = ?',
        [assetPurchaseOrderId]
      );

      if (apos.length === 0) {
        await connection.rollback();
        console.log('Asset purchase order not found');
        return res.status(404).json({ success: false, error: 'Asset purchase order not found' });
      }

      console.log('Found asset purchase order:', apos[0]);

      // Get APO items
      const [items] = await connection.query(`
        SELECT 
          apoi.*,
          ma.asset_code,
          ma.asset_name,
          ma.asset_type
        FROM asset_purchase_order_items apoi
        LEFT JOIN my_assets ma ON apoi.asset_id = ma.id
        WHERE apoi.asset_purchase_order_id = ? AND apoi.quantity > apoi.received_quantity
      `, [assetPurchaseOrderId]);

      console.log('Found items to receive:', items.length);
      if (items.length === 0) {
        await connection.rollback();
        console.log('No assets to receive');
        const errorMsg = apos[0].status === 'received' 
          ? 'This purchase order has already been received' 
          : 'No assets to receive';
        return res.status(400).json({ success: false, error: errorMsg });
      }

      // Process each asset item
      for (const item of items) {
        const remainingQty = item.quantity - item.received_quantity;
        console.log(`Processing item ${item.id}: asset_id=${item.asset_id}, remaining_qty=${remainingQty}`);
        
        // Update quantity on the existing asset
        await connection.query(`
          UPDATE my_assets 
          SET quantity = quantity + ?, 
              price = ?,
              supplier_id = ?,
              purchase_date = ?,
              location = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          remainingQty,
          item.unit_price,
          apos[0].supplier_id,
          apos[0].order_date,
          location || 'N/A',
          item.asset_id
        ]);

        console.log(`Updated asset ${item.asset_id} with qty +${remainingQty}`);

        // Update received quantity in the purchase order item
        await connection.query(`
          UPDATE asset_purchase_order_items
          SET received_quantity = ?
          WHERE id = ?
        `, [item.quantity, item.id]);

        console.log(`Updated received_quantity for item ${item.id}`);
      }

      // Update APO status to received
      await connection.query(`
        UPDATE asset_purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [assetPurchaseOrderId]);

      // === FINANCIAL TRANSACTIONS ===
      console.log('=== Starting financial transactions ===');
      
      // Calculate totals for journal entries
      const subtotal = parseFloat(apos[0].subtotal) || 0;
      const taxAmount = parseFloat(apos[0].tax_amount) || 0;
      const totalAmount = parseFloat(apos[0].total_amount) || 0;
      const supplier_id = apos[0].supplier_id;
      const apo_number = apos[0].apo_number;
      
      console.log(`Financial totals - Subtotal: ${subtotal}, Tax: ${taxAmount}, Total: ${totalAmount}`);
      
      // 1. Insert into supplier_ledger (credit, increases balance)
      const [lastLedger] = await connection.query(
        'SELECT running_balance FROM supplier_ledger WHERE supplier_id = ? ORDER BY date DESC, id DESC LIMIT 1',
        [supplier_id]
      );
      const prevBalance = lastLedger.length > 0 ? parseFloat(lastLedger[0].running_balance) : 0;
      const newBalance = prevBalance + totalAmount;
      
      await connection.query(
        `INSERT INTO supplier_ledger (supplier_id, date, description, reference_type, reference_id, debit, credit, running_balance)
         VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)`,
        [
          supplier_id,
          `Assets received for APO ${apo_number}`,
          'asset_purchase_order',
          assetPurchaseOrderId,
          0,
          totalAmount,
          newBalance
        ]
      );
      console.log('Supplier ledger updated with credit:', totalAmount);
      
      // 2. Create journal entry
      // Get account IDs
      const [fixedAssetsAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '1400' LIMIT 1`
      );
      const [apAccount] = await connection.query(
        `SELECT id FROM chart_of_accounts WHERE account_code = '2000' LIMIT 1`
      );
      const vatAccountId = 16; // Purchase Tax Control Account ID
      
      console.log('Fixed Assets Account (1400):', fixedAssetsAccount.length, fixedAssetsAccount);
      console.log('Accounts Payable (2000):', apAccount.length, apAccount);
      
      if (fixedAssetsAccount.length && apAccount.length) {
        // Create journal entry
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, CURDATE(), ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-APO-${assetPurchaseOrderId}-${Date.now()}`,
            apo_number,
            `Assets received for APO ${apo_number}`,
            totalAmount,
            totalAmount,
            1 // created_by (system/admin)
          ]
        );
        const journalEntryId = journalResult.insertId;
        console.log('Journal entry created with ID:', journalEntryId);
        
        // Debit Fixed Assets (tax-exclusive amount)
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, fixedAssetsAccount[0].id, subtotal, `Fixed Assets - APO ${apo_number}`]
        );
        console.log('Debit Fixed Assets:', subtotal);
        
        // Update account_ledger for Fixed Assets Account
        const [lastFixedAssetsLedger] = await connection.query(
          'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
          [fixedAssetsAccount[0].id]
        );
        const prevFixedAssetsBalance = lastFixedAssetsLedger.length > 0 ? parseFloat(lastFixedAssetsLedger[0].running_balance) : 0;
        const newFixedAssetsBalance = prevFixedAssetsBalance + subtotal;
        
        await connection.query(
          `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
           VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 'confirmed')`,
          [
            fixedAssetsAccount[0].id,
            `Fixed Assets - APO ${apo_number}`,
            'asset_purchase_order',
            journalEntryId,
            subtotal,
            0,
            newFixedAssetsBalance
          ]
        );
        console.log('Fixed Assets ledger updated');
        
        // Debit Purchase Tax Control (tax amount) if there's tax
        if (taxAmount > 0) {
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, ?, 0, ?)`,
            [journalEntryId, vatAccountId, taxAmount, `Purchase Tax Control - APO ${apo_number}`]
          );
          console.log('Debit Purchase Tax Control:', taxAmount);
          
          // Update account_ledger for Purchase Tax Control Account
          const [lastVatLedger] = await connection.query(
            'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
            [vatAccountId]
          );
          const prevVatBalance = lastVatLedger.length > 0 ? parseFloat(lastVatLedger[0].running_balance) : 0;
          const newVatBalance = prevVatBalance + taxAmount;
          
          await connection.query(
            `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
             VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 'confirmed')`,
            [
              vatAccountId,
              `Purchase Tax Control - APO ${apo_number}`,
              'asset_purchase_order',
              journalEntryId,
              taxAmount,
              0,
              newVatBalance
            ]
          );
          console.log('Purchase Tax Control ledger updated');
        }
        
        // Credit Accounts Payable (total with tax)
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, apAccount[0].id, totalAmount, `Accounts Payable - APO ${apo_number}`]
        );
        console.log('Credit Accounts Payable:', totalAmount);
        
        // Update account_ledger for Accounts Payable Account
        const [lastAPLedger] = await connection.query(
          'SELECT running_balance FROM account_ledger WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
          [apAccount[0].id]
        );
        const prevAPBalance = lastAPLedger.length > 0 ? parseFloat(lastAPLedger[0].running_balance) : 0;
        const newAPBalance = prevAPBalance - totalAmount; // Balance calculation: prev + debit - credit for asset_ledger
        
        await connection.query(
          `INSERT INTO account_ledger (account_id, date, description, reference_type, reference_id, debit, credit, running_balance, status)
           VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, 'confirmed')`,
          [
            apAccount[0].id,
            `Accounts Payable - APO ${apo_number}`,
            'asset_purchase_order',
            journalEntryId,
            0,
            totalAmount,
            newAPBalance
          ]
        );
        console.log('Accounts Payable ledger updated');
      } else {
        console.log('Warning: Could not find Fixed Assets or Accounts Payable accounts');
      }

      console.log('=== Financial transactions complete ===');

      console.log('Committing transaction...');
      await connection.commit();

      console.log('=== Assets received successfully ===');
      res.status(200).json({
        success: true,
        message: 'Assets received successfully'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error receiving assets:');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to receive assets',
        message: error.message
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = assetPurchaseOrderController;

