const db = require('../database/db');

const salesOrderController = {
  // Get all sales orders
  getAllSalesOrders: async (req, res) => {
    try {
      console.log('Fetching all sales orders with my_status = 1...');
      
      // First, let's check how many sales orders exist in total
      const [totalOrders] = await db.query('SELECT COUNT(*) as total FROM sales_orders');
      console.log('Total sales orders in database:', totalOrders[0].total);
      
      // Check how many have my_status = 1
      const [confirmedOrders] = await db.query('SELECT COUNT(*) as confirmed FROM sales_orders WHERE my_status = 1');
      console.log('Sales orders with my_status = 1:', confirmedOrders[0].confirmed);
      
      const [rows] = await db.query(`
        SELECT 
          so.*, 
          c.name as customer_name, 
          c.balance as customer_balance,
          u.full_name as created_by_name,
          sr.name as salesrep
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN users u ON so.created_by = u.id
        LEFT JOIN SalesRep sr ON so.salesrep = sr.id
        WHERE so.my_status = 1
        ORDER BY so.created_at DESC
      `);
      
      console.log('Query result rows:', rows.length);
      if (rows.length > 0) {
        console.log('Sample order:', rows[0]);
      }
      
      // Get items for each sales order
      for (let order of rows) {
        const [items] = await db.query(`
          SELECT 
            soi.*, 
            p.product_name, 
            p.product_code, 
            p.unit_of_measure
          FROM sales_order_items soi
          LEFT JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = ?
        `, [order.id]);
        
        // Map product fields into a product object for each item
        order.items = items.map(item => ({
          id: item.id,
          sales_order_id: item.sales_order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          tax_type: item.tax_type,
          tax_amount: parseFloat(item.tax_amount),
          net_price: parseFloat(item.net_price),
          product: {
            id: item.product_id,
            product_name: item.product_name || `Product ${item.product_id}`,
            product_code: item.product_code || 'No Code',
            unit_of_measure: item.unit_of_measure || 'PCS'
          }
        }));
      }
      
      console.log('Final response data length:', rows.length);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sales orders' });
    }
  },

  // Get all sales orders (including draft orders with my_status = 0)
  getAllSalesOrdersIncludingDrafts: async (req, res) => {
    try {
      console.log('Fetching all sales orders (including drafts)...');
      
      // First, let's check how many sales orders exist in total
      const [totalOrders] = await db.query('SELECT COUNT(*) as total FROM sales_orders');
      console.log('Total sales orders in database:', totalOrders[0].total);
      
      // Check how many have my_status = 0 (drafts)
      const [draftOrders] = await db.query('SELECT COUNT(*) as drafts FROM sales_orders WHERE my_status = 0');
      console.log('Sales orders with my_status = 0 (drafts):', draftOrders[0].drafts);
      
      // Check how many have my_status = 1 (confirmed)
      const [confirmedOrders] = await db.query('SELECT COUNT(*) as confirmed FROM sales_orders WHERE my_status = 1');
      console.log('Sales orders with my_status = 1 (confirmed):', confirmedOrders[0].confirmed);
      
      const [rows] = await db.query(`
        SELECT 
          so.*, 
          c.name as customer_name, 
          c.balance as customer_balance,
          u.full_name as created_by_name,
          sr.name as salesrep,
          r.name as rider_name,
          r.contact as rider_contact,
          receiver.name as received_by_name
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN users u ON so.created_by = u.id
        LEFT JOIN SalesRep sr ON so.salesrep = sr.id
        LEFT JOIN Riders r ON so.rider_id = r.id
        LEFT JOIN staff receiver ON so.received_by = receiver.id
        ORDER BY so.created_at DESC
      `);
      
      console.log('Query result rows:', rows.length);
      if (rows.length > 0) {
        console.log('Sample order:', rows[0]);
      }
      
      // Get items for each sales order
      for (let order of rows) {
        const [items] = await db.query(`
          SELECT 
            soi.*, 
            p.product_name, 
            p.product_code, 
            p.unit_of_measure
          FROM sales_order_items soi
          LEFT JOIN products p ON soi.product_id = p.id
          WHERE soi.sales_order_id = ?
        `, [order.id]);
        
        // Map product fields into a product object for each item
        order.items = items.map(item => ({
          id: item.id,
          sales_order_id: item.sales_order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          tax_type: item.tax_type,
          tax_amount: parseFloat(item.tax_amount),
          net_price: parseFloat(item.net_price),
          product: {
            id: item.product_id,
            product_name: item.product_name || `Product ${item.product_id}`,
            product_code: item.product_code || 'No Code',
            unit_of_measure: item.unit_of_measure || 'PCS'
          }
        }));
      }
      
      console.log('Final response data length:', rows.length);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching all sales orders:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch all sales orders' });
    }
  },

  // Get sales order by ID
  getSalesOrderById: async (req, res) => {
    try {
      const { id } = req.params;
      // Get sales order details with all customer fields
      const [salesOrders] = await db.query(`
        SELECT 
          so.*, 
          c.id as client_id,
          c.name,
          c.contact,
          c.email,
          c.address,
          c.tax_pin,
          u.full_name as created_by_name,
          sr.name as salesrep,
          r.name as rider_name,
          r.contact as rider_contact
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        LEFT JOIN users u ON so.created_by = u.id
        LEFT JOIN SalesRep sr ON so.salesrep = sr.id
        LEFT JOIN Riders r ON so.rider_id = r.id
        WHERE so.id = ?
      `, [id]);
      if (salesOrders.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      // Get sales order items
      const [items] = await db.query(`
        SELECT 
          soi.*, 
          p.product_name, 
          p.product_code, 
          p.unit_of_measure
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
      `, [id]);
      const salesOrder = salesOrders[0];
      // Map product fields into a product object for each item
      salesOrder.items = items.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price),
        tax_amount: parseFloat(item.tax_amount),
        net_price: parseFloat(item.net_price),
        product: {
          id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          unit_of_measure: item.unit_of_measure
        }
      }));
      // Construct customer object
      salesOrder.customer = {
        id: salesOrder.client_id,
        name: salesOrder.name,
        contact: salesOrder.contact,
        email: salesOrder.email,
        address: salesOrder.address,
        tax_pin: salesOrder.tax_pin
      };
      res.json({ success: true, data: salesOrder });
    } catch (error) {
      console.error('Error fetching sales order:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sales order' });
    }
  },

  // Create new sales order
  createSalesOrder: async (req, res) => {
    const connection = await db.getConnection();
    try {
      console.log('=== CREATE SALES ORDER START ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      await connection.beginTransaction();
      const { customer_id, client_id, sales_rep_id, order_date, expected_delivery_date, notes, items } = req.body;
      
      // Use either customer_id or client_id (for compatibility)
      const clientId = client_id || customer_id;
      console.log('Client ID:', clientId);
      console.log('Order date:', order_date);
      console.log('Items:', JSON.stringify(items, null, 2));
      
      // Validate that client exists
      console.log('Checking if client exists...');
      const [clientCheck] = await connection.query('SELECT id FROM Clients WHERE id = ?', [clientId]);
      console.log('Client check result:', clientCheck);
      if (clientCheck.length === 0) {
        console.log('Client not found, returning error');
        return res.status(400).json({ 
          success: false, 
          error: `Client with ID ${clientId} not found` 
        });
      }
      console.log('Client validation passed');
      
      // Use client_id directly since sales_orders table uses client_id
      const clientIdToUse = clientId;
      
      // Generate SO number
      const [soCount] = await connection.query('SELECT COUNT(*) as count FROM sales_orders');
      const soNumber = `SO-${String(soCount[0].count + 1).padStart(6, '0')}`;
      console.log('Generated SO number:', soNumber);
      
      // Calculate totals assuming unit_price is tax-inclusive and respecting per-item tax_type
      let subtotal = 0;
      let totalTaxAmount = 0;
      let totalAmount = 0;
      
      for (const item of items) {
        const gross = Number(item.quantity) * Number(item.unit_price);
        const taxType = item.tax_type || '16%';
        const taxRate = taxType === '16%' ? 0.16 : 0; // zero_rated/exempted => 0
        const net = taxRate > 0 ? +(gross / (1 + taxRate)).toFixed(2) : +gross.toFixed(2);
        const itemTaxAmount = +(gross - net).toFixed(2);
        subtotal += net;
        totalTaxAmount += itemTaxAmount;
        totalAmount += gross;
      }
      console.log('Calculated totals - Net Amount:', subtotal, 'Tax:', totalTaxAmount, 'Total:', totalAmount);
      
      // Create order in sales_orders table
      console.log('Creating order in sales_orders table...');
      const [soResult] = await connection.query(`
        INSERT INTO sales_orders (
          so_number, client_id, salesrep, order_date, expected_delivery_date, 
          notes, status, total_amount, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, NOW(), NOW())
      `, [soNumber, clientIdToUse, sales_rep_id, order_date, expected_delivery_date, notes, totalAmount, 1]);
      const salesOrderId = soResult.insertId;
      console.log('Order created with ID:', salesOrderId);
      
      // Validate that all products exist
      console.log('Validating products...');
      for (const item of items) {
        console.log('Checking product ID:', item.product_id);
        const [productCheck] = await connection.query('SELECT id FROM products WHERE id = ?', [item.product_id]);
        console.log('Product check result:', productCheck);
        if (productCheck.length === 0) {
          console.log('Product not found, returning error');
          return res.status(400).json({ 
            success: false, 
            error: `Product with ID ${item.product_id} not found` 
          });
        }
      }
      console.log('All products validated');
      
      // Create sales order items
      console.log('Creating sales order items...');
      for (const item of items) {
        console.log('Creating item:', item);
        const taxType = item.tax_type || '16%';
        const taxRate = taxType === '16%' ? 0.16 : 0; // zero_rated/exempted => 0
        const gross = Number(item.quantity) * Number(item.unit_price);
        const net = taxRate > 0 ? +(gross / (1 + taxRate)).toFixed(2) : +gross.toFixed(2);
        const taxAmount = +(gross - net).toFixed(2);
        const totalPrice = +gross.toFixed(2);
        await connection.query(`
          INSERT INTO sales_order_items (
            sales_order_id, product_id, quantity, unit_price, tax_amount, total_price, tax_type, net_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [salesOrderId, item.product_id, item.quantity, item.unit_price, taxAmount, totalPrice, taxType, totalPrice]);
      }
      console.log('All items created, committing transaction...');
      await connection.commit();
      console.log('Transaction committed successfully');
      // Get the created order
      const [createdSO] = await db.query(`
        SELECT 
          so.*, 
          c.name as customer_name
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        WHERE so.id = ?
      `, [salesOrderId]);
      res.status(201).json({ 
        success: true, 
        data: createdSO[0],
        message: 'Sales order created successfully' 
      });
    } catch (error) {
      await connection.rollback();
      console.error('=== ERROR CREATING SALES ORDER ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ success: false, error: 'Failed to create sales order' });
    } finally {
      connection.release();
      console.log('=== CREATE SALES ORDER END ===');
    }
  },

  // Update sales order
  updateSalesOrder: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const { customer_id, client_id, sales_rep_id, order_date, expected_delivery_date, notes, status, items } = req.body;
      
      // Get the current user ID from the request
      const currentUserId = req.user?.id || 1; // Default to user ID 1 if not available
      
      // Check if sales order exists and get current data
      const [existingSO] = await connection.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      
      // Use provided client_id or customer_id, otherwise keep existing client_id
      const clientId = client_id || customer_id || existingSO[0].client_id;
      
      const itemsLocked = (existingSO[0].my_status >= 1);
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;

      if (itemsLocked) {
        // Use existing DB items when order is approved/locked
        const [dbItems] = await connection.query(
          'SELECT quantity, unit_price, tax_type FROM sales_order_items WHERE sales_order_id = ?',
          [id]
        );
        for (const item of dbItems) {
          const gross = Number(item.quantity) * Number(item.unit_price);
          const rate = (item.tax_type === '16%') ? 0.16 : 0;
          const net = rate > 0 ? +(gross / (1 + rate)).toFixed(2) : +gross.toFixed(2);
          subtotal += net;
          taxAmount += +(gross - net).toFixed(2);
          totalAmount += gross;
        }
        subtotal = +subtotal.toFixed(2);
        taxAmount = +taxAmount.toFixed(2);
        totalAmount = +totalAmount.toFixed(2);
      } else {
        // If only changing status to cancelled/declined without items, preserve existing totals
        const statusMapPreview = {
          'cancel': 'cancelled',
          'cancelled': 'cancelled',
          'canceled': 'cancelled',
          'decline': 'declined',
          'declined': 'declined'
        };
        const incomingKey = (status !== undefined && status !== null) ? String(status).toLowerCase() : '';
        const incomingStatus = statusMapPreview[incomingKey];
        const statusOnly = (incomingStatus === 'cancelled' || incomingStatus === 'declined') && (!Array.isArray(items) || items.length === 0);
        if (statusOnly) {
          subtotal = Number(existingSO[0].subtotal || 0);
          taxAmount = Number(existingSO[0].tax_amount || 0);
          totalAmount = Number(existingSO[0].total_amount || 0);
        } else {
        // Validate items and calculate totals from payload
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ success: false, error: 'Order must include at least one item' });
        }

        for (const item of items) {
          if (!item || !item.product_id || Number(item.product_id) <= 0) {
            return res.status(400).json({ success: false, error: 'Each item must have a valid product selected' });
          }
          if (!item.quantity || Number(item.quantity) <= 0) {
            return res.status(400).json({ success: false, error: 'Item quantity must be greater than 0' });
          }
          if (item.unit_price === undefined || item.unit_price === null || Number(item.unit_price) < 0) {
            return res.status(400).json({ success: false, error: 'Item unit price must be 0 or greater' });
          }
          const [productCheck] = await connection.query('SELECT id FROM products WHERE id = ?', [item.product_id]);
          if (productCheck.length === 0) {
            return res.status(400).json({ success: false, error: `Product with ID ${item.product_id} not found` });
          }
        }

        // Calculate totals as tax-inclusive using per-item tax_type
        for (const item of items) {
          const gross = Number(item.quantity) * Number(item.unit_price);
          const rate = (item.tax_type === '16%') ? 0.16 : 0; // zero_rated/exempted => 0
          const net = rate > 0 ? +(gross / (1 + rate)).toFixed(2) : +gross.toFixed(2);
          subtotal += net;
          taxAmount += +(gross - net).toFixed(2);
          totalAmount += gross;
        }
        subtotal = +subtotal.toFixed(2);
        taxAmount = +taxAmount.toFixed(2);
        totalAmount = +totalAmount.toFixed(2);
        }
      }
      
      // Map numeric status to string status for database
      const statusMap = {
        '0': 'draft',
        '1': 'confirmed',
        '2': 'shipped',
        '3': 'delivered',
        // numeric shortcuts that map directly to final strings (as per user's change)
        '4': 'cancelled',
        '5': 'declined',
        // string inputs from UI
        'cancel': 'cancelled',
        'cancelled': 'cancelled',
        'canceled': 'cancelled',
        'declined': 'declined',
        'declined': 'declined'
      };
      const statusKey = (status !== undefined && status !== null) ? String(status).trim().toLowerCase() : '';
      const statusString = statusMap[statusKey] || status || existingSO[0].status;
      
      // Determine my_status based on status value (force set for cancel/decline)
      let myStatus = existingSO[0].my_status || 0;
      if (statusString === 'confirmed' && existingSO[0].status !== 'confirmed') {
        myStatus = 1; // approved on confirmation
      }
      if (statusString === 'cancelled') {
        myStatus = 4;
      }
      if (statusString === 'declined') {
        myStatus = 5;
      }
      
      // Update sales order - preserve existing values if not provided
      await connection.query(`
        UPDATE sales_orders 
        SET client_id = ?, 
            salesrep = COALESCE(?, salesrep),
            order_date = COALESCE(?, order_date), 
            expected_delivery_date = COALESCE(?, expected_delivery_date), 
            status = ?,
            my_status = ?,
            subtotal = ?,
            tax_amount = ?,
            total_amount = ?, 
            notes = COALESCE(?, notes),
            updated_at = NOW()
        WHERE id = ?
      `, [clientId, sales_rep_id, order_date, expected_delivery_date, statusString, myStatus, subtotal, taxAmount, totalAmount, notes, id]);
      
      if (!itemsLocked) {
        const statusOnlyFinal = (statusString === 'cancelled' || statusString === 'declined') && (!Array.isArray(items) || items.length === 0);
        if (!statusOnlyFinal) {
        // Delete and recreate items only if not approved/locked
        await connection.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [id]);
        for (const item of items) {
          const gross = Number(item.quantity) * Number(item.unit_price);
          const totalPrice = +gross.toFixed(2);
          const rate = (item.tax_type === '16%') ? 0.16 : 0;
          const net = rate > 0 ? +(gross / (1 + rate)).toFixed(2) : +gross.toFixed(2);
          const itemTax = +(gross - net).toFixed(2);
          await connection.query(`
            INSERT INTO sales_order_items (
              sales_order_id, product_id, quantity, unit_price, tax_amount, total_price, tax_type, net_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [id, item.product_id, item.quantity, item.unit_price, itemTax, totalPrice, item.tax_type || '16%', totalPrice]);
        }
        }
      }
      
      // Create journal entries and update client ledger when order is approved (status changes to confirmed)
      if (statusString === 'confirmed' && existingSO[0].status !== 'confirmed') {
        console.log('Creating journal entries and updating client ledger for approved order:', id);
        console.log('Status changed from:', existingSO[0].status, 'to:', statusString);
        console.log('Condition met: statusString === "confirmed" && existingSO[0].status !== "confirmed"');
        
        // Get required accounts
        const [arAccount] = await connection.query(
          'SELECT id FROM chart_of_accounts WHERE id = ? AND is_active = 1',
          ['140'] // Accounts Receivable account code
        );
        
        const [salesAccount] = await connection.query(
          'SELECT id FROM chart_of_accounts WHERE id = ? AND is_active = 1',
          ['53'] // Sales Revenue account code
        );
        
        const [taxAccount] = await connection.query(
          'SELECT id FROM chart_of_accounts WHERE id = ? AND is_active = 1',
          ['35'] // Sales Tax Payable account code
        );
        
        if (arAccount.length && salesAccount.length) {
          console.log('Creating journal entry for order:', id);
          console.log('AR Account found:', arAccount[0]);
          console.log('Sales Account found:', salesAccount[0]);
          console.log('Tax Account found:', taxAccount[0] || 'Not found');
          console.log('Current User ID:', currentUserId);
          console.log('Total Amount:', totalAmount);
          
          // Create journal entry
          const [journalResult] = await connection.query(
            `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
            [
              `JE-SO-${id}-${Date.now()}`,
              order_date || existingSO[0].order_date,
              `SO-${id}`,
              `Sales order approved - ${existingSO[0].so_number}`,
              totalAmount,
              totalAmount,
              currentUserId
            ]
          );
          const journalEntryId = journalResult.insertId;
          console.log('Journal entry created with ID:', journalEntryId);
          
          // Debit Accounts Receivable
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, ?, 0, ?)`,
            [journalEntryId, arAccount[0].id, totalAmount, `Sales order ${existingSO[0].so_number}`]
          );
          
          // Credit Sales Revenue
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, 0, ?, ?)`,
            [journalEntryId, salesAccount[0].id, subtotal, `Sales revenue for order ${existingSO[0].so_number}`]
          );
          
          // Credit Sales Tax Payable (if tax account exists and tax amount > 0)
          if (taxAccount.length > 0 && taxAmount > 0) {
            await connection.query(
              `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
               VALUES (?, ?, 0, ?, ?)`,
              [journalEntryId, taxAccount[0].id, taxAmount, `Sales tax for order ${existingSO[0].so_number}`]
            );
          }
          
          // Update client ledger
          const [lastClientLedger] = await connection.query(
            'SELECT running_balance FROM client_ledger WHERE client_id = ? ORDER BY date DESC, id DESC LIMIT 1',
            [clientId]
          );
          
          const prevBalance = lastClientLedger.length > 0 ? parseFloat(lastClientLedger[0].running_balance) : 0;
          const newBalance = prevBalance + totalAmount; // Debit increases the receivable balance
          
          await connection.query(
            `INSERT INTO client_ledger (client_id, date, description, reference_type, reference_id, debit, credit, running_balance)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              clientId,
              order_date || existingSO[0].order_date,
              `Sales order - ${existingSO[0].so_number}`,
              'sales_order',
              id,
              totalAmount,
              0,
              newBalance
            ]
          );
          
          console.log('Journal entries and client ledger updated successfully for order:', id);
          console.log('Client balance updated from', prevBalance, 'to', newBalance);
        } else {
          console.error('Required accounts not found for journal entry creation');
          console.error('AR Account (ID: 140):', arAccount);
          console.error('Sales Account (ID: 53):', salesAccount);
          if (taxAccount.length === 0) {
            console.warn('Tax Account (ID: 35) not found - tax entries will be skipped');
          }
        }
      } else {
        console.log('Journal entries not created - condition not met:');
        console.log('  statusString:', statusString);
        console.log('  existingSO[0].status:', existingSO[0].status);
        console.log('  statusString === "confirmed":', statusString === 'confirmed');
        console.log('  existingSO[0].status !== "confirmed":', existingSO[0].status !== 'confirmed');
      }
      
      await connection.commit();
      // Best-effort update of legacy column if it exists
      try {
        await connection.query('UPDATE sales_orders SET my__status = ? WHERE id = ?', [myStatus, id]);
      } catch (_) {}

      console.log('Sales order updated successfully:', id);
      console.log('Status changed to:', statusString, 'my_status set to:', myStatus);
      res.json({ success: true, message: 'Sales order updated successfully', status: statusString, my_status: myStatus });
    } catch (error) {
      await connection.rollback();
      console.error('=== ERROR UPDATING SALES ORDER ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Request body:', req.body);
      console.error('Sales order ID:', req.params.id);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update sales order',
        details: error.message 
      });
    } finally {
      connection.release();
    }
  },

  // Delete sales order
  deleteSalesOrder: async (req, res) => {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [id]);
      const [result] = await db.query('DELETE FROM sales_orders WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      res.json({ success: true, message: 'Sales order deleted successfully' });
    } catch (error) {
      console.error('Error deleting sales order:', error);
      res.status(500).json({ success: false, error: 'Failed to delete sales order' });
    }
  },

  // Assign a rider to a sales order
  assignRider: async (req, res) => {
    try {
      const { id } = req.params;
      const { riderId } = req.body;
      if (!riderId) {
        return res.status(400).json({ success: false, error: 'riderId is required' });
      }
      // Check if sales order exists
      const [existingSO] = await db.query('SELECT id FROM sales_orders WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      // Get the current user ID from the request
      const currentUserId = req.user?.id || 1; // Default to user ID 1 if not available
      // Update the sales order with the rider ID, set my_status to 2, assigned_at to now, and dispatched_by to current user
      const now = new Date();
      await db.query('UPDATE sales_orders SET rider_id = ?, my_status = 2, assigned_at = ?, dispatched_by = ? WHERE id = ?', [riderId, now, currentUserId, id]);
      res.json({ success: true, message: 'Rider assigned successfully' });
    } catch (error) {
      console.error('Error assigning rider:', error);
      res.status(500).json({ success: false, error: 'Failed to assign rider' });
    }
  },

  getSalesOrderItems: async (req, res) => {
    try {
      const { id } = req.params;
      const [items] = await db.query(`
        SELECT 
          soi.*, 
          p.product_name, 
          p.product_code, 
          p.unit_of_measure
        FROM sales_order_items soi
        LEFT JOIN products p ON soi.product_id = p.id
        WHERE soi.sales_order_id = ?
      `, [id]);
      // Map product fields into a product object for each item
      const mappedItems = items.map(item => ({
        ...item,
        product: {
          id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          unit_of_measure: item.unit_of_measure
        }
      }));
      res.json({ success: true, data: mappedItems });
    } catch (error) {
      console.error('Error fetching sales order items:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sales order items' });
    }
  },

  // Receive items back to stock for a cancelled sales order
  receiveBackToStock: async (req, res) => {
    const { id } = req.params;
    try {
      // Check if the order exists and is cancelled
      const [orders] = await db.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
      if (!orders.length) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      const order = orders[0];
      if (order.my_status !== 4) {
        return res.status(400).json({ success: false, error: 'Order is not cancelled' });
      }
      // Get all items in the order
      const [items] = await db.query('SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?', [id]);
      if (!items.length) {
        return res.status(400).json({ success: false, error: 'No items found for this order' });
      }
      // Update product stock for each item
      for (const item of items) {
        await db.query('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      // Optionally, log the action or mark the order as returned
      await db.query('UPDATE sales_orders SET returned_to_stock = 1 WHERE id = ?', [id]);
      res.json({ success: true, message: 'Items received back to stock.' });
    } catch (error) {
      console.error('Error receiving items back to stock:', error);
      res.status(500).json({ success: false, error: 'Failed to receive items back to stock' });
    }
  },

  // Convert order to invoice
  convertToInvoice: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const { expected_delivery_date, notes } = req.body;
      
      console.log('=== CONVERTING ORDER TO INVOICE ===');
      console.log('Order ID:', id);
      
      // Get the current user ID from the request
      const currentUserId = req.user?.id || 1;
      
      // Check if sales order exists and get current data
      const [existingSO] = await connection.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
      if (existingSO.length === 0) {
        return res.status(404).json({ success: false, error: 'Sales order not found' });
      }
      
      const originalOrder = existingSO[0];
      console.log('Original order status:', originalOrder.status);
      
      // Check if order is already confirmed
      if (originalOrder.status === 'confirmed') {
        return res.status(400).json({ success: false, error: 'Order is already confirmed/invoiced' });
      }
      
      // Get order items to calculate totals (unit_price stored tax-inclusive)
      const [items] = await connection.query(`
        SELECT product_id, quantity, unit_price, tax_type FROM sales_order_items WHERE sales_order_id = ?
      `, [id]);
      
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'No items found in this order' });
      }
      
      // Calculate totals as tax-inclusive
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;
      for (const item of items) {
        const gross = Number(item.quantity) * Number(item.unit_price);
        const rate = item.tax_type === '16%' ? 0.16 : 0;
        const net = rate > 0 ? +(gross / (1 + rate)).toFixed(2) : +gross.toFixed(2);
        subtotal += net;
        taxAmount += +(gross - net).toFixed(2);
        totalAmount += gross;
      }
      // Round totals
      subtotal = +subtotal.toFixed(2);
      taxAmount = +taxAmount.toFixed(2);
      totalAmount = +totalAmount.toFixed(2);
      
      // Update sales order to confirmed status and set my_status to 1
      await connection.query(`
        UPDATE sales_orders 
        SET status = 'confirmed',
            my_status = 1,
            expected_delivery_date = COALESCE(?, expected_delivery_date),
            notes = COALESCE(?, notes),
            subtotal = ?,
            tax_amount = ?,
            total_amount = ?,
            so_number = CONCAT('INV-', ?),
            updated_at = NOW()
        WHERE id = ?
      `, [expected_delivery_date, notes, subtotal, taxAmount, totalAmount, id, id]);
      
      console.log('Order updated to confirmed status');
      
      // Create journal entries for the invoice
      console.log('Creating journal entries for invoice conversion');
      
      // Get required accounts
      const [arAccount] = await connection.query(
        'SELECT id FROM chart_of_accounts WHERE id = ? AND is_active = 1',
        ['140'] // Accounts Receivable account ID
      );
      
      const [salesAccount] = await connection.query(
        'SELECT id FROM chart_of_accounts WHERE id = ? AND is_active = 1',
        ['53'] // Sales Revenue account ID
      );
      
      const [taxAccount] = await connection.query(
        'SELECT id FROM chart_of_accounts WHERE id = ? AND is_active = 1',
        ['35'] // Sales Tax Payable account ID
      );
      
      if (arAccount.length && salesAccount.length) {
        console.log('Creating journal entry for invoice conversion');
        
        // Create journal entry
        const [journalResult] = await connection.query(
          `INSERT INTO journal_entries (entry_number, entry_date, reference, description, total_debit, total_credit, status, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'posted', ?)`,
          [
            `JE-INV-${id}-${Date.now()}`,
            originalOrder.order_date,
            `INV-${id}`,
            `Invoice created from order - ${originalOrder.so_number}`,
            totalAmount,
            totalAmount,
            currentUserId
          ]
        );
        const journalEntryId = journalResult.insertId;
        console.log('Journal entry created with ID:', journalEntryId);
        
        // Debit Accounts Receivable
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, ?, 0, ?)`,
          [journalEntryId, arAccount[0].id, totalAmount, `Invoice INV-${id}`]
        );
        
        // Credit Sales Revenue
        await connection.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
           VALUES (?, ?, 0, ?, ?)`,
          [journalEntryId, salesAccount[0].id, subtotal, `Sales revenue for invoice INV-${id}`]
        );
        
        // Credit Sales Tax Payable (if tax account exists and tax amount > 0)
        if (taxAccount.length > 0 && taxAmount > 0) {
          await connection.query(
            `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit_amount, credit_amount, description)
             VALUES (?, ?, 0, ?, ?)`,
            [journalEntryId, taxAccount[0].id, taxAmount, `Sales tax for invoice INV-${id}`]
          );
        }
        
        // Update client ledger
        const [lastClientLedger] = await connection.query(
          'SELECT running_balance FROM client_ledger WHERE client_id = ? ORDER BY date DESC, id DESC LIMIT 1',
          [originalOrder.client_id]
        );
        
        const prevBalance = lastClientLedger.length > 0 ? parseFloat(lastClientLedger[0].running_balance) : 0;
        const newBalance = prevBalance + totalAmount; // Debit increases the receivable balance
        
        await connection.query(
          `INSERT INTO client_ledger (client_id, date, description, reference_type, reference_id, debit, credit, running_balance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            originalOrder.client_id,
            originalOrder.order_date,
            `Invoice - INV-${id}`,
            'sales_order',
            id,
            totalAmount,
            0,
            newBalance
          ]
        );
        
        console.log('Journal entries and client ledger updated successfully for invoice');
        console.log('Client balance updated from', prevBalance, 'to', newBalance);
        
        // Update the Clients table balance column
        try {
          await connection.query(
            'UPDATE Clients SET balance = ? WHERE id = ?',
            [newBalance, originalOrder.client_id]
          );
          console.log('Clients table balance updated successfully');
        } catch (balanceError) {
          console.warn('Failed to update Clients table balance:', balanceError.message);
          // Continue with the transaction even if balance update fails
        }
      } else {
        console.error('Required accounts not found for journal entry creation');
        console.error('AR Account (ID: 140):', arAccount);
        console.error('Sales Account (ID: 53):', salesAccount);
        if (taxAccount.length === 0) {
          console.warn('Tax Account (ID: 35) not found - tax entries will be skipped');
        }
      }
      
      await connection.commit();
      console.log('=== INVOICE CONVERSION SUCCESSFUL ===');
      console.log('Order ID:', id);
      console.log('Status updated to: confirmed');
      console.log('my_status set to: 1');
      
      res.json({ 
        success: true, 
        message: 'Order successfully converted to invoice',
        orderId: id,
        status: 'confirmed',
        my_status: 1
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('=== ERROR CONVERTING TO INVOICE ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to convert order to invoice',
        details: error.message 
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = salesOrderController; 