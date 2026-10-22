import db from '../db.js';

try {
  const [[database]] = await db.query('SELECT DATABASE() AS database_name');
  const [[tables]] = await db.query(`SELECT COUNT(*) AS table_count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('password_reset_request_attempts', 'password_reset_otps', 'password_reset_tokens', 'email_delivery_events')`);
  const [columns] = await db.query(`SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name IN ('email_verified_at', 'session_version')`);

  const result = {
    database: database.database_name,
    otpTables: Number(tables.table_count),
    userColumns: columns.map((row) => row.column_name || row.COLUMN_NAME).sort(),
  };
  console.log(JSON.stringify(result));
  if (result.database !== 'react_db_otp_test' || result.otpTables !== 4 || result.userColumns.join(',') !== 'email_verified_at,session_version') process.exitCode = 1;
} finally {
  await db.end();
}
