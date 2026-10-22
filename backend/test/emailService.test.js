import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmailService } from '../services/emailService.js';

test('mock email mode never calls the network', async () => {
  let called = false;
  const service = createEmailService({
    env: { BREVO_EMAIL_MODE: 'mock', BREVO_API_KEY: 'not-used', BREVO_SENDER_EMAIL: 'noreply@example.com' },
    fetchImpl: async () => { called = true; throw new Error('network must not be called'); },
  });
  assert.deepEqual(await service.send({ to: 'tenant@example.com', subject: 'Test', text: 'Message' }), { status: 'mocked' });
  assert.equal(called, false);
});

test('Brevo payload is sent only with configured credentials', async () => {
  let request;
  const service = createEmailService({
    env: { BREVO_EMAIL_MODE: 'live', BREVO_API_KEY: 'test-key', BREVO_SENDER_EMAIL: 'noreply@example.com', BREVO_SENDER_NAME: 'KPN Haven' },
    fetchImpl: async (url, options) => { request = { url, options }; return { ok: true }; },
  });
  assert.deepEqual(await service.send({ to: 'tenant@example.com', subject: 'Test', text: 'Message' }), { status: 'sent' });
  assert.equal(request.options.headers['api-key'], 'test-key');
  assert.equal(JSON.parse(request.options.body).to[0].email, 'tenant@example.com');
});
