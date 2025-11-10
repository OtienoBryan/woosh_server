# Sales Rep Daily Checkout Script

## Overview

This script automatically checks out all sales reps at 11:00 PM daily by updating their LoginHistory records. It finds all active sessions (status = 1) that started on the current date and updates them to:
- Set `sessionEnd` to 11:00 PM (23:00:00) of the current date
- Change `status` from 1 (active) to 2 (logged out)

## Files

- **`server/checkout-sales-reps-daily.js`** - Main checkout script
- **`server/server.js`** - Integrated scheduled task (runs at 11:00 PM UTC)

## How It Works

1. The script runs automatically every day at 11:00 PM UTC via `node-cron`
2. It queries the `LoginHistory` table for all records where:
   - `status = 1` (active session)
   - `DATE(sessionStart) = current date`
3. Updates these records to:
   - `sessionEnd = YYYY-MM-DDTHH:MM:SS` (format: `YYYY-MM-DDT23:00:00`)
   - `status = 2` (logged out)

## Manual Execution

You can also run the script manually for testing or immediate execution:

```bash
cd server
node checkout-sales-reps-daily.js
```

## Scheduled Execution

The script is automatically scheduled to run at 11:00 PM UTC every day when the server starts. The cron schedule is configured in `server.js`:

```javascript
cron.schedule('0 23 * * *', async () => {
  // Runs at 11:00 PM UTC daily
}, {
  scheduled: true,
  timezone: 'UTC'
});
```

### Changing the Timezone

If you need to run the checkout at 11:00 PM in a different timezone, modify the `timezone` option in `server.js`. For example:

- **Africa/Nairobi (EAT)**: `timezone: 'Africa/Nairobi'`
- **America/New_York (EST)**: `timezone: 'America/New_York'`

Or adjust the cron schedule time if you want a different hour.

## Database Schema

The script works with the `LoginHistory` table:

```sql
- id: int(11) PRIMARY KEY AUTO_INCREMENT
- userId: int(11)
- timezone: varchar(191) DEFAULT 'UTC'
- duration: int(11)
- status: int(11) DEFAULT 0 (0=inactive, 1=active, 2=logged out)
- sessionEnd: varchar(191)
- sessionStart: varchar(191)
```

## Status Values

- **0**: Inactive
- **1**: Active (logged in)
- **2**: Logged out

## Logging

The script provides detailed logging:
- Number of active sessions found
- Number of sessions updated
- Success/error messages
- Timestamps

## Error Handling

- If no active sessions are found, the script completes successfully with a message
- Database errors are caught and logged with detailed error information
- The script does not crash the server if an error occurs

## Testing

To test the script manually:

1. Ensure you have active sessions in LoginHistory with `status = 1`
2. Run: `node server/checkout-sales-reps-daily.js`
3. Check the console output for results
4. Verify the database records were updated correctly

## Notes

- The script uses UTC timezone to match the server's timezone configuration
- Only sessions that started on the current date are checked out
- The `sessionEnd` is set in ISO format: `YYYY-MM-DDTHH:MM:SS`
- The script is idempotent - running it multiple times won't cause issues (it only updates records with `status = 1`)

