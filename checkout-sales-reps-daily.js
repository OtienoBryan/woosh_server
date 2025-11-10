const db = require('./database/db');

/**
 * Script to checkout all sales reps at 11:00 PM
 * Updates LoginHistory records where status = 1 (active) to:
 * - Set sessionEnd to 11:00 PM of the current date
 * - Change status to 2 (logged out)
 */
async function checkoutSalesReps() {
  try {
    console.log('=== SALES REP DAILY CHECKOUT ===');
    console.log(`Started at: ${new Date().toISOString()}\n`);

    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Set sessionEnd to 11:00 PM (23:00:00) of current date
    // Format: YYYY-MM-DDTHH:MM:SS (ISO format)
    const sessionEnd = `${dateStr}T23:00:00`;
    
    console.log(`Checking out sales reps for date: ${dateStr}`);
    console.log(`Setting sessionEnd to: ${sessionEnd}`);
    
    // Get count of active sessions (status = 1) that started on the current date
    // DATE() function extracts the date part from sessionStart for comparison
    const [activeSessions] = await db.query(
      'SELECT COUNT(*) as count FROM LoginHistory WHERE status = 1 AND DATE(sessionStart) = ?',
      [dateStr]
    );
    
    const activeCount = activeSessions[0].count;
    console.log(`Found ${activeCount} active session(s) to checkout for ${dateStr}\n`);
    
    if (activeCount === 0) {
      console.log('No active sessions found for today. Nothing to update.');
      console.log('=== CHECKOUT COMPLETE ===\n');
      return { success: true, updated: 0, message: 'No active sessions to checkout' };
    }
    
    // Update all active sessions (status = 1) that started on the current date
    // Set sessionEnd to 11:00 PM of current date and change status to 2 (logged out)
    const [updateResult] = await db.query(
      `UPDATE LoginHistory 
       SET sessionEnd = ?, status = 2 
       WHERE status = 1 AND DATE(sessionStart) = ?`,
      [sessionEnd, dateStr]
    );
    
    const updatedCount = updateResult.affectedRows;
    console.log(`✅ Successfully checked out ${updatedCount} sales rep(s)`);
    console.log(`Updated records: ${updatedCount}`);
    console.log('=== CHECKOUT COMPLETE ===\n');
    
    return { 
      success: true, 
      updated: updatedCount, 
      date: dateStr,
      sessionEnd: sessionEnd,
      message: `Successfully checked out ${updatedCount} sales rep(s)` 
    };
    
  } catch (error) {
    console.error('❌ Error during sales rep checkout:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('=== CHECKOUT FAILED ===\n');
    
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to checkout sales reps' 
    };
  }
}

// If running directly (not imported), execute the function
if (require.main === module) {
  checkoutSalesReps()
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export for use in other modules (e.g., scheduled tasks)
module.exports = checkoutSalesReps;
