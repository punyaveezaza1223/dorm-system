import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createEmailVerificationClient,
  createVerificationAttemptGuard,
} from '../lib/emailVerificationApi';

const EMAIL_VERIFICATION_API = (
  import.meta.env.VITE_EMAIL_VERIFICATION_API_URL
  || import.meta.env.VITE_API_URL
  || 'http://localhost:4000/api'
).replace(/\/+$/, '');

const verificationClient = createEmailVerificationClient({
  baseUrl: EMAIL_VERIFICATION_API,
  isDevelopment: import.meta.env.DEV,
});

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token') || '';
  const confirmGuard = useRef(createVerificationAttemptGuard());
  const resendGuard = useRef(createVerificationAttemptGuard());
  const [status, setStatus] = useState(token ? 'ready' : 'invalid');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(token ? 'กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ' : 'ไม่พบลิงก์ยืนยันอีเมลที่ใช้งานได้');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const confirm = async () => {
    if (!token || !confirmGuard.current.begin()) return;
    setSubmitting(true);
    setMessage('');
    try {
      const result = await verificationClient.confirmVerification(token);
      setStatus('verified');
      setMessage(result.message || 'ยืนยันอีเมลเรียบร้อยแล้ว');
    } catch (error) {
      confirmGuard.current.reset();
      setStatus('invalid');
      setMessage(error.message || 'ไม่สามารถยืนยันอีเมลได้ในขณะนี้');
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMessage('กรุณากรอกอีเมลที่ใช้สมัครสมาชิก');
      return;
    }
    if (!resendGuard.current.begin()) return;
    setResending(true);
    try {
      const result = await verificationClient.requestVerification(email.trim());
      setMessage(result.message || 'ระบบได้รับคำขอส่งลิงก์ยืนยันแล้ว');
    } catch (error) {
      setMessage(error.message || 'ไม่สามารถส่งลิงก์ยืนยันได้ในขณะนี้');
      resendGuard.current.reset();
    } finally {
      setResending(false);
    }
  };

  const title = status === 'verified' ? 'ยืนยันอีเมลสำเร็จ' : 'ยืนยันอีเมล';
  const subtitle = status === 'verified'
    ? 'อีเมลของคุณพร้อมใช้สำหรับการกู้คืนบัญชีและการแจ้งเตือนแล้ว'
    : 'เพื่อความปลอดภัย โปรดยืนยันความเป็นเจ้าของอีเมลก่อนใช้งานบริการอีเมลของ KPN Haven';

  return (
    <main id="screen-recovery">
      <div className="login-wrap">
        <section className="login-side" aria-label="KPN Haven">
          <div className="brandmark"><div className="fob" /><div className="name" style={{ color: '#fff' }}>KPN Haven<small style={{ color: 'rgba(255,255,255,.85)' }}>ระบบจัดการหอพักและคอนโด</small></div></div>
          <h1>ยืนยันอีเมลของคุณ<br />เพื่อใช้งานได้อย่างปลอดภัย</h1>
          <p>การยืนยันอีเมลช่วยให้คุณกู้คืนบัญชีผ่าน OTP และรับการแจ้งเตือนสำคัญจาก KPN Haven ได้</p>
          <ul className="feature-chips"><li>ยืนยันอีเมล</li><li>กู้คืนบัญชี</li><li>รับการแจ้งเตือน</li></ul>
        </section>

        <section className="login-form recovery-form" aria-labelledby="verify-email-title">
          <button type="button" className="recovery-back" onClick={() => navigate('/')}>← กลับสู่หน้าเข้าสู่ระบบ</button>
          <div className="form-head">
            <h1 id="verify-email-title" className="form-title">{title}</h1>
            <p className="form-sub">{subtitle}</p>
          </div>

          {message && <div className={`form-message ${status === 'verified' ? 'ok' : ''}`} role="alert">{message}</div>}

          {status === 'ready' && <button type="button" className="btn btn-primary btn-block" onClick={confirm} disabled={submitting}>
            {submitting ? 'กำลังยืนยันอีเมล...' : 'ยืนยันอีเมล'}
          </button>}

          {status === 'verified' && <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('/')}>เข้าสู่ระบบ</button>}

          {status === 'invalid' && <form className="verification-resend-form" onSubmit={resend}>
            <div className="field">
              <label htmlFor="verification-resend-email">ต้องการลิงก์ยืนยันใหม่?</label>
              <input id="verification-resend-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={resending}>
              {resending ? 'กำลังส่งลิงก์...' : 'ส่งลิงก์ยืนยันใหม่'}
            </button>
          </form>}
        </section>
      </div>
    </main>
  );
}
