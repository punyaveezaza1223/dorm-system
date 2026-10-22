const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const htmlEscape = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

export const createEmailService = ({ env = process.env, fetchImpl = globalThis.fetch, logger = console } = {}) => {
  const mode = String(env.BREVO_EMAIL_MODE || '').toLowerCase();
  const apiKey = env.BREVO_API_KEY;
  const senderEmail = env.BREVO_SENDER_EMAIL;
  const senderName = env.BREVO_SENDER_NAME || 'KPN Haven';

  const isConfigured = () => Boolean(apiKey && senderEmail);

  const send = async ({ to, subject, text, html }) => {
    if (!to || !subject) throw new Error('Email recipient and subject are required');
    if (mode === 'mock') return { status: 'mocked' };
    if (mode !== 'live') return { status: 'skipped', reason: 'BREVO_EMAIL_MODE is not live' };
    if (!isConfigured()) return { status: 'skipped', reason: 'Brevo is not configured' };

    const response = await fetchImpl(BREVO_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || `<p>${htmlEscape(text)}</p>`,
      }),
    });
    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      logger.error('Brevo send failed', { status: response.status, responseBody: responseBody.slice(0, 500) });
      throw new Error(`Brevo request failed (${response.status})`);
    }
    return { status: 'sent' };
  };

  return { send, isConfigured };
};

export const emailService = createEmailService();

export const passwordResetEmail = ({ otp }) => ({
  subject: 'รหัสยืนยันการกู้คืนบัญชี KPN Haven',
  text: `รหัส OTP สำหรับกู้คืนบัญชี KPN Haven คือ ${otp} รหัสนี้ใช้ได้ 5 นาที หากคุณไม่ได้ทำรายการนี้ สามารถละเว้นอีเมลฉบับนี้ได้`,
  html: `<p>รหัส OTP สำหรับกู้คืนบัญชี KPN Haven คือ</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${htmlEscape(otp)}</p><p>รหัสนี้ใช้ได้ 5 นาที หากคุณไม่ได้ทำรายการนี้ สามารถละเว้นอีเมลฉบับนี้ได้</p>`,
});

export const emailVerificationEmail = ({ verificationUrl }) => ({
  subject: 'ยืนยันอีเมลสำหรับบัญชี KPN Haven',
  text: `กรุณายืนยันอีเมลของคุณสำหรับ KPN Haven โดยเปิดลิงก์นี้ แล้วกดปุ่มยืนยันอีเมล:\n${verificationUrl}\n\nลิงก์นี้ใช้ได้ 24 ชั่วโมง หากคุณไม่ได้ทำรายการนี้ สามารถละเว้นอีเมลฉบับนี้ได้`,
  html: `<p>กรุณายืนยันอีเมลของคุณสำหรับ KPN Haven</p><p><a href="${htmlEscape(verificationUrl)}">เปิดหน้าสำหรับยืนยันอีเมล</a></p><p>หลังเปิดลิงก์แล้ว โปรดกดปุ่มยืนยันอีเมล ลิงก์นี้ใช้ได้ 24 ชั่วโมง</p><p>หากคุณไม่ได้ทำรายการนี้ สามารถละเว้นอีเมลฉบับนี้ได้</p>`,
});
