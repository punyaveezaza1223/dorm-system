import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';

// This route smoke test does not create records, send mail, or read a user.
// It proves the public confirmation API returns JSON before any token lookup.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'react_db_otp_test';
process.env.BREVO_EMAIL_MODE = 'mock';

const { default: app } = await import('../server.js');

test('email verification confirmation rejects a malformed token as JSON without side effects', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/email-verification/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid' }),
    });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type') || '', /application\/json/i);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.match(body.message, /ลิงก์ยืนยันอีเมล/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
