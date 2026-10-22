import { randomBytes } from 'node:crypto';
import {
  hmac,
  isValidEmail,
  normalizeEmail,
  secureHashEquals,
} from './passwordRecovery.js';

export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;
export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_VERIFICATION_MAX_REQUESTS_PER_EMAIL_HOUR = 5;
export const EMAIL_VERIFICATION_MAX_REQUESTS_PER_IP_HOUR = 20;

// This token is intentionally independent from password-reset credentials.
export const generateEmailVerificationToken = () => randomBytes(32).toString('base64url');

export const hashEmailVerificationToken = ({ token, secret }) => (
  hmac(`email-verification-token:${token}`, secret)
);

// Persisting a keyed digest binds a link to the email address that was current
// when it was issued without duplicating the plaintext address in the token table.
export const hashEmailVerificationAddress = ({ email, secret }) => (
  hmac(`email-verification-address:${normalizeEmail(email)}`, secret)
);

export const hashEmailVerificationRateValue = ({ value, secret }) => (
  hmac(`email-verification-rate:${String(value || '')}`, secret)
);

export const isPlausibleVerificationToken = (token) => /^[A-Za-z0-9_-]{40,}$/.test(String(token || ''));

export const buildEmailVerificationUrl = ({ baseUrl, token }) => {
  const url = new URL(String(baseUrl || ''));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid email verification frontend URL');
  url.searchParams.set('token', token);
  return url.toString();
};

export {
  isValidEmail,
  normalizeEmail,
  secureHashEquals,
};
