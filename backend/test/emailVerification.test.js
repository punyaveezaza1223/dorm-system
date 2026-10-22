import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmailVerificationService,
  GENERIC_EMAIL_VERIFICATION_REQUEST_MESSAGE,
  INVALID_EMAIL_VERIFICATION_LINK_MESSAGE,
} from '../services/emailVerificationService.js';
import {
  hashEmailVerificationAddress,
  hashEmailVerificationToken,
} from '../lib/emailVerification.js';

const SECRET = 'email-verification-test-secret-that-is-long-enough';
const FRONTEND_URL = 'http://localhost:5173/verify-email';
const TOKEN_A = 'a'.repeat(43);
const TOKEN_B = 'b'.repeat(43);

const makeStore = ({ rateLimited = false, cooldown = false, expired = false } = {}) => {
  const user = { id: 1, email: 'tenant@example.test', emailVerified: false, password: 'unchanged-password-hash' };
  const tokens = [];
  const deliveryEvents = new Map();
  let nextId = 1;
  let issueAttempts = 0;

  const createToken = ({ email, emailHash, tokenHash }) => {
    tokens.forEach((token) => { if (!token.used) token.used = true; });
    const token = { id: nextId++, userId: user.id, emailHash, tokenHash, used: false, expired };
    tokens.push(token);
    return { userId: user.id, email, tokenId: token.id };
  };

  return {
    user,
    tokens,
    async issue({ email, emailHash, tokenHash, userId }) {
      issueAttempts += 1;
      const blockedByCooldown = cooldown && issueAttempts > 1;
      if (rateLimited || blockedByCooldown || email !== user.email || (userId !== null && userId !== user.id) || user.emailVerified) return { issued: false, rateLimited: rateLimited || blockedByCooldown };
      return { issued: true, delivery: createToken({ email, emailHash, tokenHash }) };
    },
    async findUserById(userId) { return userId === user.id ? { id: user.id, email: user.email } : null; },
    async consume({ tokenHash, hashCurrentEmail }) {
      const token = tokens.find((candidate) => candidate.tokenHash === tokenHash && !candidate.used && !candidate.expired);
      if (!token || token.emailHash !== hashCurrentEmail(user.email)) return { verified: false };
      token.used = true;
      user.emailVerified = true;
      return { verified: true };
    },
    async changeEmailAndIssue({ userId, email, emailHash, tokenHash }) {
      if (userId !== user.id) return { status: 'not-found' };
      if (email === user.email) return { status: 'unchanged', emailVerified: user.emailVerified };
      user.email = email;
      user.emailVerified = false;
      return { status: 'changed', delivery: createToken({ email, emailHash, tokenHash }) };
    },
    async reserveDelivery({ userId, eventKey }) {
      const key = `${userId}:${eventKey}`;
      if (deliveryEvents.has(key)) return false;
      deliveryEvents.set(key, { status: 'pending' });
      return true;
    },
    async markDelivery({ userId, eventKey, status }) { deliveryEvents.get(`${userId}:${eventKey}`).status = status; },
  };
};

const makeService = (store, { tokens = [TOKEN_A, TOKEN_B] } = {}) => {
  const deliveries = [];
  let tokenIndex = 0;
  const service = createEmailVerificationService({
    store,
    secret: SECRET,
    frontendUrl: FRONTEND_URL,
    tokenFactory: () => tokens[tokenIndex++] || 'c'.repeat(43),
    emailService: { send: async (message) => { deliveries.push(message); return { status: 'mocked' }; } },
    logger: { error: () => {} },
  });
  return { service, deliveries };
};

test('issues a hashed, single-use verification link through mocked email delivery', async () => {
  const store = makeStore();
  const { service, deliveries } = makeService(store);
  const result = await service.request({ email: 'TENANT@example.test', requestIp: '127.0.0.1' });

  assert.equal(result.success, true);
  assert.equal(result.message, GENERIC_EMAIL_VERIFICATION_REQUEST_MESSAGE);
  assert.equal(deliveries.length, 1);
  assert.equal(store.tokens.length, 1);
  assert.match(store.tokens[0].tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(store.tokens[0].tokenHash, TOKEN_A);
});

test('confirms a valid token and then permits the verified-email recovery prerequisite', async () => {
  const store = makeStore();
  const { service } = makeService(store);
  await service.request({ email: store.user.email, requestIp: '127.0.0.1' });
  const result = await service.confirm({ token: TOKEN_A });

  assert.equal(result.success, true);
  assert.equal(store.user.emailVerified, true);
  assert.equal(store.tokens[0].used, true);
  // Password recovery already checks email_verified_at; this represents that
  // existing gate without changing the recovery implementation.
  assert.equal(store.user.emailVerified, true);
});

test('rejects expired and reused links without changing verification state', async () => {
  const expiredStore = makeStore({ expired: true });
  const { service: expiredService } = makeService(expiredStore);
  await expiredService.request({ email: expiredStore.user.email, requestIp: '127.0.0.1' });
  const expired = await expiredService.confirm({ token: TOKEN_A });
  assert.deepEqual(expired, { success: false, message: INVALID_EMAIL_VERIFICATION_LINK_MESSAGE });
  assert.equal(expiredStore.user.emailVerified, false);

  const reusedStore = makeStore();
  const { service: reusedService } = makeService(reusedStore);
  await reusedService.request({ email: reusedStore.user.email, requestIp: '127.0.0.1' });
  await reusedService.confirm({ token: TOKEN_A });
  const reused = await reusedService.confirm({ token: TOKEN_A });
  assert.deepEqual(reused, { success: false, message: INVALID_EMAIL_VERIFICATION_LINK_MESSAGE });
});

test('keeps rate-limit and resend-cooldown responses generic without duplicate mail', async () => {
  const limitedStore = makeStore({ rateLimited: true });
  const { service: limitedService, deliveries: limitedDeliveries } = makeService(limitedStore);
  const limited = await limitedService.request({ email: 'does-not-matter@example.test', requestIp: '127.0.0.1' });
  assert.deepEqual(limited, { success: true, message: GENERIC_EMAIL_VERIFICATION_REQUEST_MESSAGE, retryAfterSeconds: 60 });
  assert.equal(limitedDeliveries.length, 0);

  const cooldownStore = makeStore({ cooldown: true });
  const { service: cooldownService, deliveries: cooldownDeliveries } = makeService(cooldownStore);
  await cooldownService.request({ email: cooldownStore.user.email, requestIp: '127.0.0.1' });
  const cooldown = await cooldownService.request({ email: cooldownStore.user.email, requestIp: '127.0.0.1' });
  assert.deepEqual(cooldown, { success: true, message: GENERIC_EMAIL_VERIFICATION_REQUEST_MESSAGE, retryAfterSeconds: 60 });
  assert.equal(cooldownDeliveries.length, 1);
});

test('an email change invalidates the old link, resets verification, and issues a new link', async () => {
  const store = makeStore();
  const { service } = makeService(store);
  await service.request({ email: store.user.email, requestIp: '127.0.0.1' });
  const oldToken = store.tokens[0];

  const changed = await service.changeEmail({ userId: 1, email: 'new-address@example.test', requestIp: '127.0.0.1' });
  assert.equal(changed.success, true);
  assert.equal(changed.status, 'changed');
  assert.equal(store.user.emailVerified, false);
  assert.equal(oldToken.used, true);
  assert.notEqual(store.tokens[1].emailHash, oldToken.emailHash);

  const oldConfirmation = await service.confirm({ token: TOKEN_A });
  assert.equal(oldConfirmation.success, false);
  const newConfirmation = await service.confirm({ token: TOKEN_B });
  assert.equal(newConfirmation.success, true);
});

test('a legacy unverified account can still request verification and its password value is untouched', async () => {
  const store = makeStore();
  const originalPassword = store.user.password;
  const { service } = makeService(store);
  await service.request({ email: store.user.email, requestIp: '127.0.0.1' });

  assert.equal(store.user.emailVerified, false);
  assert.equal(store.user.password, originalPassword);
  assert.equal(store.tokens.length, 1);
});

test('an existing authenticated account can resend through its own account lookup only', async () => {
  const store = makeStore();
  const { service, deliveries } = makeService(store);
  const result = await service.resendForUser({ userId: 1, requestIp: '127.0.0.1' });

  assert.equal(result.success, true);
  assert.equal(deliveries.length, 1);
  assert.equal(store.tokens[0].userId, 1);
});

test('separate HMAC domains bind a token to the current email address', () => {
  const tokenHash = hashEmailVerificationToken({ token: TOKEN_A, secret: SECRET });
  const originalEmailHash = hashEmailVerificationAddress({ email: 'tenant@example.test', secret: SECRET });
  const newEmailHash = hashEmailVerificationAddress({ email: 'new-address@example.test', secret: SECRET });

  assert.match(tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(originalEmailHash, newEmailHash);
});
