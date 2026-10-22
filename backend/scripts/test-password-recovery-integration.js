import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

// This script intentionally targets only the isolated test database and forces
// Brevo mock mode before importing the application.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'react_db_otp_test';
process.env.BREVO_EMAIL_MODE = 'mock';

const [{ default: app }, { default: db }, recovery] = await Promise.all([
  import('../server.js'),
  import('../db.js'),
  import('../lib/passwordRecovery.js'),
]);

const server = await new Promise((resolve) => {
  const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
});
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/api`;
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const email = `otp.integration.${suffix}@example.test`;
const username = `otp_test_${suffix}`;
const oldPassword = `OldTest!${suffix}`;
const newPassword = `NewTest!${suffix}`;
const recoverySecret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || 'rental-system-secret-key';

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  return { response, body: await response.json() };
};

const seedOtp = async (userId, otp, expiresInSeconds) => {
  await db.query('UPDATE password_reset_otps SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', [userId]);
  await db.query(`INSERT INTO password_reset_otps (user_id, otp_hash, request_ip_hash, expires_at)
    VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))`, [
    userId,
    recovery.hashOtp({ userId, otp, secret: recoverySecret }),
    '0'.repeat(64),
    expiresInSeconds,
  ]);
};

try {
  const [created] = await db.query(`INSERT INTO users
    (username, password, role, full_name, phone, email, email_verified_at, session_version)
    VALUES (?, ?, 'tenant', 'OTP Integration Test', ?, ?, CURRENT_TIMESTAMP, 0)`, [
    username, await bcrypt.hash(oldPassword, 10), `099${suffix.slice(-7).padStart(7, '0')}`, email,
  ]);
  const userId = created.insertId;

  const firstRequest = await request('/auth/password-recovery/request-otp', { method: 'POST', body: JSON.stringify({ email }) });
  assert.equal(firstRequest.response.status, 200);
  assert.equal(firstRequest.body.success, true);
  const repeatedRequest = await request('/auth/password-recovery/request-otp', { method: 'POST', body: JSON.stringify({ email }) });
  assert.equal(repeatedRequest.response.status, 200);
  const [[requestCount]] = await db.query('SELECT COUNT(*) AS count FROM password_reset_request_attempts WHERE email_hash = ?', [
    recovery.hashRateLimitValue({ value: email, secret: recoverySecret }),
  ]);
  assert.equal(Number(requestCount.count), 2);

  await seedOtp(userId, '123456', -60);
  const expired = await request('/auth/password-recovery/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp: '123456' }) });
  assert.equal(expired.response.status, 400);

  await seedOtp(userId, '123456', 300);
  const wrongOtp = await request('/auth/password-recovery/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp: '654321' }) });
  assert.equal(wrongOtp.response.status, 400);

  await seedOtp(userId, '123456', 300);
  const verified = await request('/auth/password-recovery/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp: '123456' }) });
  assert.equal(verified.response.status, 200);
  assert.equal(typeof verified.body.resetToken, 'string');

  const oldLogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ login: email, password: oldPassword, role: 'tenant' }) });
  assert.equal(oldLogin.response.status, 200);
  const reset = await request('/auth/password-recovery/reset-password', { method: 'POST', body: JSON.stringify({ resetToken: verified.body.resetToken, password: newPassword }) });
  assert.equal(reset.response.status, 200, reset.body.message);
  const reusedToken = await request('/auth/password-recovery/reset-password', { method: 'POST', body: JSON.stringify({ resetToken: verified.body.resetToken, password: newPassword }) });
  assert.equal(reusedToken.response.status, 400);
  const invalidatedSession = await request('/notifications', { headers: { authorization: `Bearer ${oldLogin.body.token}` } });
  assert.equal(invalidatedSession.response.status, 401);
  const oldPasswordLogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ login: email, password: oldPassword, role: 'tenant' }) });
  assert.equal(oldPasswordLogin.response.status, 401);
  const newPasswordLogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ login: email, password: newPassword, role: 'tenant' }) });
  assert.equal(newPasswordLogin.response.status, 200);

  console.log(JSON.stringify({ success: true, database: process.env.DB_NAME, brevoMode: process.env.BREVO_EMAIL_MODE }));
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await db.end();
}
