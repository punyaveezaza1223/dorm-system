import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RecoveryApiError,
  createPasswordRecoveryClient,
  createResetAttemptGuard,
} from '../lib/passwordRecoveryApi';

const OTP_LENGTH = 6;
const PASSWORD_RECOVERY_API = (import.meta.env.VITE_PASSWORD_RECOVERY_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
const recoveryApi = createPasswordRecoveryClient({
  baseUrl: PASSWORD_RECOVERY_API,
  isDevelopment: import.meta.env.DEV,
});

function RecoverAccount() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const otpRefs = useRef([]);
  const resetAttemptGuard = useRef(createResetAttemptGuard());

  const nextToOtp = async (event) => {
    event.preventDefault();

    if (!/^\S+@\S+\.\S+$/.test(identifier.trim())) {
      setMessage('กรุณากรอกอีเมลที่ใช้สมัครสมาชิก');
      return;
    }

    setSubmitting(true);
    try {
      await recoveryApi.requestOtp(identifier.trim());
      setIdentifier(identifier.trim().toLowerCase());
      setOtp(Array(OTP_LENGTH).fill(''));
      setMessage('');
      setStep(2);
    } catch (error) {
      setMessage(error.message || 'ไม่สามารถส่งรหัส OTP ได้ในขณะนี้');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const digits = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH)
      .split('');

    if (!digits.length) return;

    setOtp([...digits, ...Array(OTP_LENGTH - digits.length).fill('')]);
    otpRefs.current[Math.min(digits.length, OTP_LENGTH) - 1]?.focus();
  };

  const verifyOtp = async (event) => {
    event.preventDefault();

    if (otp.join('').length !== OTP_LENGTH) {
      setMessage('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    setSubmitting(true);
    try {
      const result = await recoveryApi.verifyOtp(identifier, otp.join(''));
      if (!result.resetToken) throw new RecoveryApiError('รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว');
      setResetToken(String(result.resetToken));
      resetAttemptGuard.current.reset();
      setMessage('');
      setStep(3);
    } catch (error) {
      setMessage(error.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว');
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();

    if (passwords.password.length < 8) {
      setMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      setMessage('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (!resetToken) {
      setMessage('กรุณายืนยันรหัส OTP ใหม่อีกครั้ง');
      setStep(1);
      return;
    }

    if (!resetAttemptGuard.current.begin()) return;

    setSubmitting(true);
    let resetSucceeded = false;
    try {
      await recoveryApi.resetPassword(resetToken, passwords.password);
      resetSucceeded = true;
      setResetToken('');
      setMessage('ตั้งรหัสผ่านใหม่สำเร็จ กำลังกลับไปหน้าเข้าสู่ระบบ...');
      window.setTimeout(() => navigate('/'), 1200);
    } catch (error) {
      setMessage(error.message || 'ไม่สามารถตั้งรหัสผ่านใหม่ได้ในขณะนี้');
      // A reset token and its verified OTP are single-use. Never retry an
      // uncertain failed request; start again so the user can request a
      // completely fresh OTP and reset token.
      setResetToken('');
      setOtp(Array(OTP_LENGTH).fill(''));
      setStep(1);
    } finally {
      if (!resetSucceeded) setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 1) {
      navigate('/');
      return;
    }

    setMessage('');
    if (step === 3) {
      setResetToken('');
      resetAttemptGuard.current.reset();
    }
    setStep((currentStep) => currentStep - 1);
  };

  const title = {
    1: 'กู้คืนบัญชี',
    2: 'ยืนยันรหัส OTP',
    3: 'ตั้งรหัสผ่านใหม่',
  }[step];

  const subtitle = {
    1: 'ระบุข้อมูลที่ใช้สมัครสมาชิกเพื่อเริ่มกู้คืนบัญชี',
    2: 'กรอกรหัส 6 หลักที่ส่งไปยังช่องทางที่ลงทะเบียนไว้',
    3: 'ตั้งรหัสผ่านใหม่เพื่อกลับเข้าใช้งานระบบ',
  }[step];

  return (
    <main id="screen-recovery">
      <div className="login-wrap">
        <section className="login-side" aria-label="KPN Haven">
          <div className="brandmark">
            <div className="fob" />
            <div className="name" style={{ color: '#fff' }}>
              KPN Haven
              <small style={{ color: 'rgba(255,255,255,.85)' }}>
                ระบบจัดการหอพักและคอนโด
              </small>
            </div>
          </div>

          <h1>
            กลับเข้าใช้งานบัญชีของคุณ
            <br />
            ได้อย่างปลอดภัย
          </h1>
          <p>
            ยืนยันตัวตนผ่านรหัส OTP แล้วตั้งรหัสผ่านใหม่เพื่อกลับมาจัดการข้อมูลห้องพักของคุณ
          </p>
          <ul className="feature-chips" aria-label="ขั้นตอนการกู้คืนบัญชี">
            <li>ยืนยันตัวตน</li>
            <li>รหัส OTP</li>
            <li>ตั้งรหัสผ่านใหม่</li>
          </ul>
        </section>

        <section className="login-form recovery-form" aria-labelledby="recovery-title">
          <button type="button" className="recovery-back" onClick={goBack}>
            ← {step === 1 ? 'กลับสู่หน้าเข้าสู่ระบบ' : 'ย้อนกลับ'}
          </button>

          <div className="recovery-progress" aria-label={`ขั้นตอนที่ ${step} จาก 3`}>
            {[1, 2, 3].map((progressStep) => (
              <span
                key={progressStep}
                className={progressStep <= step ? 'active' : ''}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="form-head">
            <h1 id="recovery-title" className="form-title">{title}</h1>
            <p className="form-sub">{subtitle}</p>
          </div>

          {message && <div className="form-message" role="alert">{message}</div>}

          {step === 1 && (
            <form onSubmit={nextToOtp}>
              <div className="field">
                <label htmlFor="recovery-identifier">อีเมล</label>
                <input
                  id="recovery-identifier"
                  type="email"
                  autoComplete="email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="example@email.com"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'กำลังส่งรหัส OTP...' : 'รับรหัส OTP'}
              </button>
              <p className="recovery-note">
                หากอีเมลนี้ผูกกับบัญชีและยืนยันแล้ว ระบบจะส่งรหัส OTP ให้ทางอีเมล
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOtp}>
              <p className="otp-destination">
                รหัส OTP จะถูกส่งไปยัง <strong>{identifier}</strong>
              </p>
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { otpRefs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`OTP หลักที่ ${index + 1}`}
                    maxLength="1"
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP'}
              </button>
              <p className="recovery-note">
                ไม่ได้รับรหัส? รอ 60 วินาทีแล้วกดย้อนกลับเพื่อขอรหัสใหม่
              </p>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={resetPassword}>
              <div className="field">
                <label htmlFor="recovery-password">รหัสผ่านใหม่</label>
                <input
                  id="recovery-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.password}
                  onChange={(event) => setPasswords((current) => ({ ...current, password: event.target.value }))}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="recovery-confirm-password">ยืนยันรหัสผ่านใหม่</label>
                <input
                  id="recovery-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                />
              </div>
              <button type="submit" className="btn btn-brass btn-block" disabled={submitting}>
                {submitting ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default RecoverAccount;
