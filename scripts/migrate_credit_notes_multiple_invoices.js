const db = require('../database/db');

async function migrateCreditNotesToMultipleInvoices() {
  let connection;
  try {
    console.log('Starting migration: credit_notes table to support multiple invoices...');
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    // Step 1: Add new column for multiple invoice IDs
    console.log('Step 1: Adding original_invoice_ids column...');
    await connection.query(`
      ALTER TABLE credit_notes 
      ADD COLUMN original_invoice_ids JSON AFTER original_invoice_id
    `);
    console.log('✓ Added original_invoice_ids column');
    
    // Step 2: Migrate existing data from original_invoice_id to original_invoice_ids
    console.log('Step 2: Migrating existing data...');
    const [existingCreditNotes] = await connection.query(`
      SELECT id, original_invoice_id FROM credit_notes 
      WHERE original_invoice_id IS NOT NULL
    `);
    
    for (const creditNote of existingCreditNotes) {
      if (creditNote.original_invoice_id) {
        await connection.query(`
          UPDATE credit_notes 
          SET original_invoice_ids = JSON_ARRAY(?) 
          WHERE id = ?
        `, [creditNote.original_invoice_id, creditNote.id]);
      }
    }
    console.log(`✓ Migrated ${existingCreditNotes.length} existing credit notes`);
    
    // Step 3: Drop the old single invoice ID column
    console.log('Step 3: Dropping original_invoice_id column...');
    await connection.query(`
      ALTER TABLE credit_notes 
      DROP COLUMN original_invoice_id
    `);
    console.log('✓ Dropped original_invoice_id column');
    
    // Step 4: Update indexes
    console.log('Step 4: Updating indexes...');
    try {
      await connection.query(`
        DROP INDEX idx_original_invoice_id ON credit_notes
      `);
      console.log('✓ Dropped old index');
    } catch (indexError) {
      console.log('Note: Old index was already removed or didn\'t exist');
    }
    
    await connection.commit();
    console.log('✓ Migration completed successfully!');
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('Migration failed, rolling back changes...');
    }
    console.error('Migration error:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateCreditNotesToMultipleInvoices()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateCreditNotesToMultipleInvoices;
