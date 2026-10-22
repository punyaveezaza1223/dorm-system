import db from '../db.js';

const TEST_DATABASE = 'react_db_otp_test';
const TEST_USER_ID = 15;
const TEST_API = 'http://127.0.0.1:4010/api';

if (process.env.DB_NAME !== TEST_DATABASE || process.env.BREVO_EMAIL_MODE !== 'mock') {
  throw new Error('This request script requires the local test database and Brevo mock mode');
}

try {
  const [[database]] = await db.query('SELECT DATABASE() AS database_name');
  if (database.database_name !== TEST_DATABASE) throw new Error('Active database is not the OTP test database');
  const [[account]] = await db.query(`SELECT email, email_verified_at
    FROM users WHERE id = ? LIMIT 1`, [TEST_USER_ID]);
  if (!account?.email || !account.email_verified_at) throw new Error('The authorized test account is not verified');
  const [[before]] = await db.query('SELECT COUNT(*) AS count FROM password_reset_otps WHERE user_id = ?', [TEST_USER_ID]);

  const health = await fetch(`${TEST_API.replace('/api', '')}/`, { signal: AbortSignal.timeout(5_000) });
  const response = await fetch(`${TEST_API}/auth/password-recovery/request-otp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email }),
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.json();
  const [[after]] = await db.query('SELECT COUNT(*) AS count FROM password_reset_otps WHERE user_id = ?', [TEST_USER_ID]);
  const [[latest]] = await db.query(`SELECT TIMESTAMPDIFF(SECOND, created_at, CURRENT_TIMESTAMP) AS age_seconds
    FROM password_reset_otps WHERE user_id = ? ORDER BY id DESC LIMIT 1`, [TEST_USER_ID]);

  console.log(JSON.stringify({
    database: database.database_name,
    configuredBrevoMode: process.env.BREVO_EMAIL_MODE,
    testServerReachable: health.ok,
    apiStatus: response.status,
    apiSuccess: body.success === true,
    otpCreated: Number(after.count) > Number(before.count),
    latestOtpAgeSeconds: latest ? Number(latest.age_seconds) : null,
  }));
} finally {
  await db.end();
}
