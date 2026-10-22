export const RECOVERY_SERVICE_ERROR = 'ไม่สามารถเชื่อมต่อบริการกู้คืนบัญชีได้ กรุณาลองใหม่อีกครั้ง';

export class RecoveryApiError extends Error {}

export const createResetAttemptGuard = () => {
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

export const createPasswordRecoveryClient = ({
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        if (isDevelopment) logger.warn('[Password recovery API] Expected JSON response', { status: response.status, contentType });
        throw new RecoveryApiError(RECOVERY_SERVICE_ERROR);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        throw new RecoveryApiError(RECOVERY_SERVICE_ERROR);
      }
      if (!response.ok || !result?.success) {
        throw new RecoveryApiError(typeof result?.message === 'string' ? result.message : RECOVERY_SERVICE_ERROR);
      }
      return result;
    } catch (error) {
      if (error instanceof RecoveryApiError) throw error;
      if (isDevelopment) logger.warn('[Password recovery API] Request failed', { name: error?.name });
      throw new RecoveryApiError(RECOVERY_SERVICE_ERROR);
    } finally {
      timer.clearTimeout(timeout);
    }
  };

  return {
    requestOtp: (email) => post('/auth/password-recovery/request-otp', { email }),
    verifyOtp: (email, otp) => post('/auth/password-recovery/verify-otp', { email, otp }),
    resetPassword: (resetToken, password) => post('/auth/password-recovery/reset-password', { resetToken, password }),
  };
};
