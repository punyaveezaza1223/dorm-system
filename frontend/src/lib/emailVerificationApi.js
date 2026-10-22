export const EMAIL_VERIFICATION_SERVICE_ERROR = 'ไม่สามารถเชื่อมต่อบริการยืนยันอีเมลได้ กรุณาลองใหม่อีกครั้ง';

export class EmailVerificationApiError extends Error {}

export const createVerificationAttemptGuard = () => {
  let attempted = false;
  return {
    begin: () => {
      if (attempted) return false;
      attempted = true;
      return true;
    },
    reset: () => { attempted = false; },
  };
};

export const createEmailVerificationClient = ({
  baseUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  timer = globalThis,
  isDevelopment = false,
  logger = console,
} = {}) => {
  const apiBaseUrl = String(baseUrl || '').replace(/\/+$/, '');

  const post = async (path, payload) => {
    const controller = new AbortController();
    const timeout = timer.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${apiBaseUrl}${path}`, {
        method: 'POST',
        // Public verification endpoints intentionally never receive a session
        // token. This prevents a :4000 session being sent to the :4010 test API.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        if (isDevelopment) logger.warn('[Email verification API] Expected JSON response', { status: response.status, contentType });
        throw new EmailVerificationApiError(EMAIL_VERIFICATION_SERVICE_ERROR);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        throw new EmailVerificationApiError(EMAIL_VERIFICATION_SERVICE_ERROR);
      }
      if (!response.ok || !result?.success) {
        throw new EmailVerificationApiError(typeof result?.message === 'string' ? result.message : EMAIL_VERIFICATION_SERVICE_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof EmailVerificationApiError) throw error;
      if (isDevelopment) logger.warn('[Email verification API] Request failed', { name: error?.name });
      throw new EmailVerificationApiError(EMAIL_VERIFICATION_SERVICE_ERROR);
    } finally {
      timer.clearTimeout(timeout);
    }
  };

  return {
    requestVerification: (email) => post('/auth/email-verification/request', { email }),
    confirmVerification: (token) => post('/auth/email-verification/confirm', { token }),
  };
};
