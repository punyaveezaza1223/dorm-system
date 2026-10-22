import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmailVerificationClient,
  createVerificationAttemptGuard,
  EMAIL_VERIFICATION_SERVICE_ERROR,
} from '../src/lib/emailVerificationApi.js';

const jsonResponse = ({ ok = true, status = 200, body = { success: true } } = {}) => ({
  ok,
  status,
  headers: { get: () => 'application/json; charset=utf-8' },
  json: async () => body,
});

test('verification client posts public request and confirmation payloads without Authorization', async () => {
  const calls = [];
  const client = createEmailVerificationClient({
    baseUrl: 'http://localhost:4010/api/',
    fetchImpl: async (url, options) => { calls.push({ url, options }); return jsonResponse(); },
  });

  await client.requestVerification('tenant@example.test');
  await client.confirmVerification('a'.repeat(43));

  assert.equal(calls[0].url, 'http://localhost:4010/api/auth/email-verification/request');
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'tenant@example.test' });
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[1].url, 'http://localhost:4010/api/auth/email-verification/confirm');
  assert.deepEqual(JSON.parse(calls[1].options.body), { token: 'a'.repeat(43) });
  assert.equal(calls[1].options.headers.Authorization, undefined);
});

test('verification client shows a safe service error for an HTML/non-JSON response', async () => {
  const client = createEmailVerificationClient({
    baseUrl: 'http://localhost:4010/api',
    fetchImpl: async () => ({ ok: false, status: 404, headers: { get: () => 'text/html' }, json: async () => { throw new Error('not JSON'); } }),
  });

  await assert.rejects(client.confirmVerification('a'.repeat(43)), { message: EMAIL_VERIFICATION_SERVICE_ERROR });
});

test('expired or reused links retain the safe backend message', async () => {
  const client = createEmailVerificationClient({
    baseUrl: 'http://localhost:4010/api',
    fetchImpl: async () => jsonResponse({ ok: false, status: 400, body: { success: false, message: 'ลิงก์ยืนยันอีเมลหมดอายุหรือถูกใช้งานแล้ว' } }),
  });

  await assert.rejects(client.confirmVerification('a'.repeat(43)), { message: 'ลิงก์ยืนยันอีเมลหมดอายุหรือถูกใช้งานแล้ว' });
});

test('submission guard prevents accidental duplicate request or confirmation posts', () => {
  const guard = createVerificationAttemptGuard();
  assert.equal(guard.begin(), true);
  assert.equal(guard.begin(), false);
  guard.reset();
  assert.equal(guard.begin(), true);
});
