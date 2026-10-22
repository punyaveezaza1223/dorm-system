import 'dotenv/config';

const hasValue = (name) => Boolean(String(process.env[name] || '').trim());

console.log(JSON.stringify({
  mode: process.env.BREVO_EMAIL_MODE || null,
  brevoApiKeyConfigured: hasValue('BREVO_API_KEY'),
  senderEmailConfigured: hasValue('BREVO_SENDER_EMAIL'),
  senderNameConfigured: hasValue('BREVO_SENDER_NAME'),
  jwtSecretConfigured: hasValue('JWT_SECRET'),
  passwordResetSecretConfigured: hasValue('PASSWORD_RESET_SECRET'),
}));
