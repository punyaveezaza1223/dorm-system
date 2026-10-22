import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateOtp, generateResetToken, hashOtp, hashResetToken, secureHashEquals,
} from '../lib/passwordRecovery.js';

test('OTP is a six digit value and only its keyed digest is persisted', () => {
  const otp = generateOtp();
  const digest = hashOtp({ userId: 42, otp, secret: 'test-secret' });
  assert.match(otp, /^\d{6}$/);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, otp);
  assert.equal(secureHashEquals(digest, hashOtp({ userId: 42, otp, secret: 'test-secret' })), true);
  assert.equal(secureHashEquals(digest, hashOtp({ userId: 43, otp, secret: 'test-secret' })), false);
});

test('reset tokens are opaque, long, and compare via keyed digest', () => {
  const token = generateResetToken();
  const digest = hashResetToken({ token, secret: 'test-secret' });
  assert.ok(token.length >= 40);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(secureHashEquals(digest, hashResetToken({ token, secret: 'test-secret' })), true);
});
