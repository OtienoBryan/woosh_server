const db = require('./database/db');

async function syncClientBalances() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('=== SYNCING CLIENT BALANCES ===\n');
    
    // Get all clients
    const [clients] = await connection.query('SELECT id, name FROM Clients');
    console.log(`Found ${clients.length} clients to sync`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const client of clients) {
      try {
        // Calculate outstanding balance from client_ledger
        const [balanceResult] = await connection.query(`
          SELECT COALESCE(SUM(debit - credit), 0) as outstanding_balance
          FROM client_ledger 
          WHERE client_id = ?
        `, [client.id]);
        
        const outstandingBalance = parseFloat(balanceResult[0]?.outstanding_balance || 0);
        
        // Update the Clients table
        await connection.query(
          'UPDATE Clients SET balance = ? WHERE id = ?',
          [outstandingBalance, client.id]
        );
        
        console.log(`✅ Client ${client.name} (ID: ${client.id}): Balance synced to ${outstandingBalance}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error syncing client ${client.name} (ID: ${client.id}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== SYNC SUMMARY ===');
    console.log(`Total clients: ${clients.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✅ All client balances synced successfully!');
    } else {
      console.log('\n⚠️  Some clients had errors during sync');
    }
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

syncClientBalances();
