const db = require('./database/db');

/**
 * Test script to checkout sales reps for yesterday's date
 * Updates LoginHistory records where status = 1 (active) to:
 * - Set sessionEnd to 11:00 PM of yesterday's date
 * - Change status to 2 (logged out)
 */
async function checkoutSalesRepsYesterday() {
  try {
    console.log('=== TEST: SALES REP CHECKOUT FOR YESTERDAY ===');
    console.log(`Started at: ${new Date().toISOString()}\n`);

    // Get yesterday's date in YYYY-MM-DD format
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1); // Subtract one day
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Set sessionEnd to 11:00 PM (23:00:00) of yesterday's date
    // Format: YYYY-MM-DDTHH:MM:SS (ISO format)
    const sessionEnd = `${dateStr}T23:00:00`;
    
    console.log(`Testing checkout for date: ${dateStr} (yesterday)`);
    console.log(`Setting sessionEnd to: ${sessionEnd}\n`);
    
    // First, check what active sessions exist for yesterday
    const [activeSessions] = await db.query(
      'SELECT id, userId, sessionStart, sessionEnd, status FROM LoginHistory WHERE status = 1 AND DATE(sessionStart) = ?',
      [dateStr]
    );
    
    console.log(`Found ${activeSessions.length} active session(s) for ${dateStr}:`);
    if (activeSessions.length > 0) {
      console.table(activeSessions);
      console.log('');
    } else {
      console.log('No active sessions found for yesterday.\n');
    }
    
    // Also check if there are any active sessions from other dates
    const [allActiveSessions] = await db.query(
      'SELECT id, userId, sessionStart, sessionEnd, status, DATE(sessionStart) as sessionDate FROM LoginHistory WHERE status = 1 ORDER BY sessionStart DESC',
      []
    );
    
    if (allActiveSessions.length > 0) {
      console.log(`Total active sessions across all dates: ${allActiveSessions.length}`);
      console.log('Active sessions by date:');
      const byDate = {};
      allActiveSessions.forEach(session => {
        const date = session.sessionDate || 'Unknown';
        byDate[date] = (byDate[date] || 0) + 1;
      });
      console.table(byDate);
      console.log('');
    }
    
    if (activeSessions.length === 0) {
      console.log('⚠️  No active sessions found for yesterday. Nothing to update.');
      console.log('=== TEST COMPLETE (NO UPDATES) ===\n');
      return { 
        success: true, 
        updated: 0, 
        date: dateStr,
        message: 'No active sessions to checkout for yesterday' 
      };
    }
    
    // Ask for confirmation before updating (in a real scenario, you might want to add a prompt)
    console.log(`⚠️  About to update ${activeSessions.length} session(s) for ${dateStr}`);
    console.log(`    Setting sessionEnd to: ${sessionEnd}`);
    console.log(`    Changing status from 1 to 2\n`);
    
    // Update all active sessions for yesterday
    const [updateResult] = await db.query(
      `UPDATE LoginHistory 
       SET sessionEnd = ?, status = 2 
       WHERE status = 1 AND DATE(sessionStart) = ?`,
      [sessionEnd, dateStr]
    );
    
    const updatedCount = updateResult.affectedRows;
    console.log(`✅ Successfully checked out ${updatedCount} sales rep(s) for ${dateStr}`);
    console.log(`Updated records: ${updatedCount}`);
    
    // Verify the update
    const [updatedSessions] = await db.query(
      'SELECT id, userId, sessionStart, sessionEnd, status FROM LoginHistory WHERE DATE(sessionStart) = ? AND status = 2 ORDER BY id DESC LIMIT 10',
      [dateStr]
    );
    
    console.log('\nUpdated sessions (showing last 10):');
    if (updatedSessions.length > 0) {
      console.table(updatedSessions);
    }
    
    console.log('\n=== TEST COMPLETE ===\n');
    
    return { 
      success: true, 
      updated: updatedCount, 
      date: dateStr,
      sessionEnd: sessionEnd,
      message: `Successfully checked out ${updatedCount} sales rep(s) for yesterday` 
    };
    
  } catch (error) {
    console.error('❌ Error during sales rep checkout test:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    console.log('=== TEST FAILED ===\n');
    
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to checkout sales reps for yesterday' 
    };
  }
}

// Execute the test
checkoutSalesRepsYesterday()
  .then((result) => {
    if (result.success) {
      console.log('✅ Test completed successfully');
      process.exit(0);
    } else {
      console.error('❌ Test failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
