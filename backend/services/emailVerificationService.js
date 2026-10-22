import {
  EMAIL_VERIFICATION_MAX_REQUESTS_PER_EMAIL_HOUR,
  EMAIL_VERIFICATION_MAX_REQUESTS_PER_IP_HOUR,
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  buildEmailVerificationUrl,
  generateEmailVerificationToken,
  hashEmailVerificationAddress,
  hashEmailVerificationRateValue,
  hashEmailVerificationToken,
  isPlausibleVerificationToken,
  isValidEmail,
  normalizeEmail,
  secureHashEquals,
} from '../lib/emailVerification.js';
import { emailVerificationEmail } from './emailService.js';

export const GENERIC_EMAIL_VERIFICATION_REQUEST_MESSAGE = 'หากอีเมลนี้ผูกกับบัญชีและยังไม่ได้ยืนยัน ระบบจะส่งลิงก์ยืนยันไปทางอีเมล';
export const INVALID_EMAIL_VERIFICATION_LINK_MESSAGE = 'ลิงก์ยืนยันอีเมลหมดอายุ ถูกใช้งานแล้ว หรือไม่ถูกต้อง';

// The repository keeps SQL and transaction handling separate from the workflow
// so the security rules can be tested with a fully mocked store.
export const createMySqlEmailVerificationStore = ({ db }) => {
  const withTransaction = async (callback) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  };

  const findLimitsAndRecordAttempt = async (connection, { emailHash, ipHash }) => {
    // The indexed locking reads also lock an empty key range under MySQL's
    // default InnoDB isolation level, so concurrent requests cannot all pass
    // the cooldown check before any one of them records its attempt.
    const [emailAttempts] = await connection.query(`SELECT
      created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL ${EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS} SECOND) AS within_cooldown
      FROM email_verification_request_attempts
      WHERE email_hash = ? AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)
      FOR UPDATE`, [emailHash]);
    const [ipAttempts] = await connection.query(`SELECT id
      FROM email_verification_request_attempts
      WHERE ip_hash = ? AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 1 HOUR)
      FOR UPDATE`, [ipHash]);
    await connection.query('INSERT INTO email_verification_request_attempts (email_hash, ip_hash) VALUES (?, ?)', [emailHash, ipHash]);
    return {
      rateLimited: emailAttempts.some((attempt) => Number(attempt.within_cooldown) === 1)
        || emailAttempts.length >= EMAIL_VERIFICATION_MAX_REQUESTS_PER_EMAIL_HOUR
        || ipAttempts.length >= EMAIL_VERIFICATION_MAX_REQUESTS_PER_IP_HOUR,
    };
  };

  const createTokenForUser = async (connection, { user, emailHash, tokenHash }) => {
    await connection.query('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', [user.id]);
    const [insert] = await connection.query(`INSERT INTO email_verification_tokens
      (user_id, email_hash, token_hash, expires_at)
      VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR))`, [user.id, emailHash, tokenHash]);
    return { userId: user.id, email: user.email, tokenId: insert.insertId };
  };

  return {
    async issue({ email, emailHash, ipHash, tokenHash, userId = null }) {
      return withTransaction(async (connection) => {
        const { rateLimited } = await findLimitsAndRecordAttempt(connection, { emailHash, ipHash });
        if (rateLimited || !isValidEmail(email)) return { issued: false, rateLimited };

        const [[user]] = userId === null
          ? await connection.query(`SELECT id, email, email_verified_at FROM users
              WHERE LOWER(email) = ? LIMIT 1 FOR UPDATE`, [email])
          : await connection.query(`SELECT id, email, email_verified_at FROM users
              WHERE id = ? LIMIT 1 FOR UPDATE`, [userId]);

        if (!user || normalizeEmail(user.email) !== email || user.email_verified_at) return { issued: false, rateLimited: false };
        return { issued: true, delivery: await createTokenForUser(connection, { user, emailHash, tokenHash }) };
      });
    },

    async findUserById(userId) {
      const [[user]] = await db.query('SELECT id, email FROM users WHERE id = ? LIMIT 1', [userId]);
      return user || null;
    },

    async consume({ tokenHash, hashCurrentEmail }) {
      return withTransaction(async (connection) => {
        const [[record]] = await connection.query(`SELECT t.id, t.user_id, t.email_hash, u.email
          FROM email_verification_tokens t
          INNER JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > CURRENT_TIMESTAMP
          LIMIT 1 FOR UPDATE`, [tokenHash]);
        if (!record) return { verified: false };
        // A token issued for an old address must never remain reusable after a
        // later email change, including one made outside this endpoint.
        if (!secureHashEquals(record.email_hash, hashCurrentEmail(record.email))) {
          await connection.query('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
          return { verified: false };
        }

        await connection.query('UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?', [record.user_id]);
        await connection.query('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [record.id]);
        return { verified: true };
      });
    },

    async changeEmailAndIssue({ userId, email, emailHash, ipHash, tokenHash }) {
      return withTransaction(async (connection) => {
        const [[currentUser]] = await connection.query(`SELECT id, email, email_verified_at
          FROM users WHERE id = ? LIMIT 1 FOR UPDATE`, [userId]);
        if (!currentUser) return { status: 'not-found' };
        if (normalizeEmail(currentUser.email) === email) return { status: 'unchanged', emailVerified: Boolean(currentUser.email_verified_at) };

        const [[existingUser]] = await connection.query('SELECT id FROM users WHERE LOWER(email) = ? AND id <> ? LIMIT 1', [email, userId]);
        if (existingUser) return { status: 'email-in-use' };

        const { rateLimited } = await findLimitsAndRecordAttempt(connection, { emailHash, ipHash });
        if (rateLimited) return { status: 'rate-limited' };

        await connection.query('UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?', [email, userId]);
        await connection.query('UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', [userId]);
        const delivery = await createTokenForUser(connection, {
          user: { id: userId, email },
          emailHash,
          tokenHash,
        });
        return { status: 'changed', delivery };
      });
    },

    async reserveDelivery({ userId, eventKey }) {
      const [reservation] = await db.query(`INSERT IGNORE INTO email_delivery_events
        (recipient_id, event_key, event_type) VALUES (?, ?, 'email_verification')`, [userId, eventKey]);
      return Boolean(reservation.affectedRows);
    },

    async markDelivery({ userId, eventKey, status, errorMessage = null }) {
      await db.query(`UPDATE email_delivery_events
        SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END, last_error = ?
        WHERE recipient_id = ? AND event_key = ?`, [status, status, errorMessage, userId, eventKey]);
    },
  };
};

export const createEmailVerificationService = ({
  store,
  emailService,
  secret,
  frontendUrl,
  logger = console,
  tokenFactory = generateEmailVerificationToken,
} = {}) => {
  if (!store || !emailService || !secret) throw new Error('Email verification service is not configured');

  const hashAddress = (email) => hashEmailVerificationAddress({ email, secret });
  const deliver = async ({ userId, email, tokenId, token }) => {
    const eventKey = `email-verification:${tokenId}`;
    try {
      if (!await store.reserveDelivery({ userId, eventKey })) return;
      const verificationUrl = buildEmailVerificationUrl({ baseUrl: frontendUrl, token });
      const result = await emailService.send({ to: email, ...emailVerificationEmail({ verificationUrl }) });
      await store.markDelivery({
        userId,
        eventKey,
        status: result.status === 'sent' || result.status === 'mocked' ? 'sent' : 'skipped',
        errorMessage: result.reason || null,
      });
    } catch (error) {
      // Never include the recipient address or token in logs.
      logger.error('Email verification delivery failed:', String(error?.message || 'unknown error').slice(0, 500));
      await store.markDelivery({ userId, eventKey, status: 'failed', errorMessage: String(error?.message || 'Email delivery failed').slice(0, 500) }).catch(() => {});
    }
  };

  const issue = async ({ email, requestIp, userId = null }) => {
    const normalizedEmail = normalizeEmail(email);
    const token = tokenFactory();
    const result = await store.issue({
      email: normalizedEmail,
      userId,
      emailHash: hashAddress(normalizedEmail),
      ipHash: hashEmailVerificationRateValue({ value: requestIp, secret }),
      tokenHash: hashEmailVerificationToken({ token, secret }),
    });
    if (result?.delivery) await deliver({ ...result.delivery, token });
    return { success: true, message: GENERIC_EMAIL_VERIFICATION_REQUEST_MESSAGE, retryAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS };
  };

  return {
    request: ({ email, requestIp }) => issue({ email, requestIp }),

    async resendForUser({ userId, requestIp }) {
      const user = await store.findUserById(userId);
      return issue({ email: user?.email || '', requestIp, userId });
    },

    async confirm({ token }) {
      if (!isPlausibleVerificationToken(token)) return { success: false, message: INVALID_EMAIL_VERIFICATION_LINK_MESSAGE };
      const result = await store.consume({
        tokenHash: hashEmailVerificationToken({ token, secret }),
        hashCurrentEmail: hashAddress,
      });
      return result?.verified
        ? { success: true, message: 'ยืนยันอีเมลเรียบร้อยแล้ว' }
        : { success: false, message: INVALID_EMAIL_VERIFICATION_LINK_MESSAGE };
    },

    async changeEmail({ userId, email, requestIp }) {
      const normalizedEmail = normalizeEmail(email);
      if (!isValidEmail(normalizedEmail)) return { success: false, status: 'invalid-email', message: 'รูปแบบอีเมลไม่ถูกต้อง' };
      const token = tokenFactory();
      const result = await store.changeEmailAndIssue({
        userId,
        email: normalizedEmail,
        emailHash: hashAddress(normalizedEmail),
        ipHash: hashEmailVerificationRateValue({ value: requestIp, secret }),
        tokenHash: hashEmailVerificationToken({ token, secret }),
      });
      if (result?.status === 'email-in-use') return { success: false, status: result.status, message: 'ไม่สามารถใช้อีเมลนี้ได้' };
      if (result?.status === 'rate-limited') return { success: false, status: result.status, message: 'โปรดรอสักครู่ก่อนขอเปลี่ยนอีเมลอีกครั้ง' };
      if (result?.status === 'not-found') return { success: false, status: result.status, message: 'ไม่พบบัญชีผู้ใช้' };
      if (result?.status === 'unchanged') return { success: true, status: result.status, emailVerified: result.emailVerified, message: 'อีเมลนี้เป็นอีเมลปัจจุบันของคุณแล้ว' };
      if (result?.delivery) await deliver({ ...result.delivery, token });
      return { success: true, status: 'changed', emailVerified: false, message: 'บันทึกอีเมลใหม่แล้ว โปรดตรวจสอบลิงก์ยืนยันในกล่องจดหมาย' };
    },
  };
};
