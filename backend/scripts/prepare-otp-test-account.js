import db from '../db.js';

const TEST_DATABASE = 'react_db_otp_test';
const TEST_USER_ID = 15;
const apply = process.argv.includes('--apply-verification');

if (process.env.DB_NAME !== TEST_DATABASE) {
  throw new Error('This script requires DB_NAME=react_db_otp_test');
}

try {
  const [[database]] = await db.query('SELECT DATABASE() AS database_name');
  if (database.database_name !== TEST_DATABASE) {
    throw new Error('Refusing to operate because the active database is not the OTP test database');
  }

  const [[account]] = await db.query(`SELECT id, email, email_verified_at
    FROM users WHERE id = ? LIMIT 1`, [TEST_USER_ID]);
  const result = {
    database: database.database_name,
    userId: TEST_USER_ID,
    accountFound: Boolean(account),
    emailPresent: Boolean(account?.email),
    verified: Boolean(account?.email_verified_at),
    updated: false,
  };

  if (apply && account?.email && !account.email_verified_at) {
    const [update] = await db.query(`UPDATE users
      SET email_verified_at = CURRENT_TIMESTAMP
      WHERE id = ? AND email_verified_at IS NULL`, [TEST_USER_ID]);
    result.updated = update.affectedRows === 1;
    result.verified = result.updated;
  }

  console.log(JSON.stringify(result));
  if (!result.accountFound || !result.emailPresent) process.exitCode = 1;
} finally {
  await db.end();
}
