import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RECOVERY_SERVICE_ERROR,
  createPasswordRecoveryClient,
  createResetAttemptGuard,
} from '../src/lib/passwordRecoveryApi.js';

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'content-type': 'application/json; charset=utf-8' }),
  json: async () => body,
});

test('reset-password sends only resetToken and password in the expected JSON shape', async () => {
  let request;
  const client = createPasswordRecoveryClient({
    baseUrl: 'http://localhost:4010/api',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return jsonResponse({ success: true });
    },
  });

  await client.resetPassword('opaque-token', 'SafePassword8!');
  assert.equal(request.url, 'http://localhost:4010/api/auth/password-recovery/reset-password');
  assert.deepEqual(JSON.parse(request.options.body), {
    resetToken: 'opaque-token',
    password: 'SafePassword8!',
  });
});

test('verify OTP preserves the reset token returned by the API for the caller', async () => {
  const client = createPasswordRecoveryClient({
    baseUrl: 'http://localhost:4010/api',
    fetchImpl: async () => jsonResponse({ success: true, resetToken: 'opaque-token' }),
  });
  const result = await client.verifyOtp('tenant@example.test', '123456');
  assert.equal(typeof result.resetToken, 'string');
  assert.ok(result.resetToken.length > 0);
});

test('expired or used reset token exposes the safe backend message', async () => {
  const client = createPasswordRecoveryClient({
    baseUrl: 'http://localhost:4010/api',
    fetchImpl: async () => jsonResponse({ success: false, message: 'ลิงก์ตั้งรหัสผ่านหมดอายุหรือถูกใช้งานแล้ว' }, 400),
  });
  await assert.rejects(() => client.resetPassword('opaque-token', 'SafePassword8!'), {
    message: 'ลิงก์ตั้งรหัสผ่านหมดอายุหรือถูกใช้งานแล้ว',
  });
});

test('a non-JSON response becomes a safe service error', async () => {
  const client = createPasswordRecoveryClient({
    baseUrl: 'http://localhost:4010/api',
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => { throw new Error('must not parse HTML'); },
    }),
  });
  await assert.rejects(() => client.requestOtp('tenant@example.test'), { message: RECOVERY_SERVICE_ERROR });
});

test('a reset attempt guard blocks duplicate submit until a new OTP verification resets it', () => {
  const guard = createResetAttemptGuard();
  assert.equal(guard.begin(), true);
  assert.equal(guard.begin(), false);
  guard.reset();
  assert.equal(guard.begin(), true);
});
