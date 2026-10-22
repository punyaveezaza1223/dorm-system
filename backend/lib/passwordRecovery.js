import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 5;
export const RESET_TOKEN_TTL_MINUTES = 10;

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export const generateOtp = () => randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, '0');

export const generateResetToken = () => randomBytes(32).toString('base64url');

export const hmac = (value, secret) => createHmac('sha256', secret).update(value).digest('hex');

export const hashOtp = ({ userId, otp, secret }) => hmac(`password-reset-otp:${userId}:${otp}`, secret);

export const hashResetToken = ({ token, secret }) => hmac(`password-reset-token:${token}`, secret);

export const hashRateLimitValue = ({ value, secret }) => hmac(`password-reset-rate:${value}`, secret);

export const secureHashEquals = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
};
