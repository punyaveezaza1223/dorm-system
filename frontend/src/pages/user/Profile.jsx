import { useRef, useState } from 'react';
import { Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import {
  createEmailVerificationClient,
  createVerificationAttemptGuard,
} from '../../lib/emailVerificationApi';

const ACCOUNT_API = 'http://localhost:4000/api';
const EMAIL_VERIFICATION_API = (
  import.meta.env.VITE_EMAIL_VERIFICATION_API_URL
  || import.meta.env.VITE_API_URL
  || ACCOUNT_API
).replace(/\/+$/, '');

const verificationClient = createEmailVerificationClient({
  baseUrl: EMAIL_VERIFICATION_API,
  isDevelopment: import.meta.env.DEV,
});

export default function Profile() {
  const { tenant, updateTenant } = useOutletContext();
  const resendGuard = useRef(createVerificationAttemptGuard());
  const [email, setEmail] = useState(tenant?.email || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [saving, setSaving] = useState(false);

  const resend = async () => {
    if (!tenant?.email || !resendGuard.current.begin()) return;
    setError('');
    setMessage('');
    setResending(true);
    try {
      // This is deliberately a public, generic request: the local 4000 JWT is
      // never sent to a separately configured 4010 verification service.
      const result = await verificationClient.requestVerification(tenant.email);
      setMessage(result.message || 'ระบบได้รับคำขอส่งลิงก์ยืนยันแล้ว');
    } catch (requestError) {
      setError(requestError.message || 'ไม่สามารถส่งลิงก์ยืนยันได้ในขณะนี้');
      resendGuard.current.reset();
    } finally {
      setResending(false);
    }
  };

  const changeEmail = async (event) => {
    event.preventDefault();
    const nextEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(nextEmail)) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${ACCOUNT_API}/tenant/email`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ email: nextEmail }),
      });
      const contentType = response.headers.get('content-type') || '';
      const result = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok || !result?.success) throw new Error(result?.message || 'ไม่สามารถเปลี่ยนอีเมลได้ในขณะนี้');
      if (result.status === 'changed') updateTenant?.((current) => ({ ...current, email: nextEmail, emailVerified: false }));
      setMessage(result.message || 'บันทึกอีเมลเรียบร้อยแล้ว');
    } catch (requestError) {
      setError(requestError.message || 'ไม่สามารถเปลี่ยนอีเมลได้ในขณะนี้');
    } finally {
      setSaving(false);
    }
  };

  const verified = Boolean(tenant?.emailVerified);
  return (
    <div className="page profile-page" data-p="res-profile">
      <div className="page-head"><div className="eyebrow">บัญชีของฉัน</div><h2>ข้อมูลส่วนตัว</h2><p>จัดการอีเมลสำหรับการกู้คืนบัญชีและการรับการแจ้งเตือน</p></div>

      <section className="card card-pad profile-card">
        <div className={`profile-verification-state ${verified ? 'verified' : 'pending'}`}>
          {verified ? <ShieldCheck size={24} aria-hidden="true" /> : <ShieldAlert size={24} aria-hidden="true" />}
          <div><b>{verified ? 'ยืนยันอีเมลแล้ว' : 'ยังไม่ได้ยืนยันอีเมล'}</b><p>{verified ? 'คุณสามารถใช้การกู้คืนบัญชีผ่าน OTP และรับการแจ้งเตือนอีเมลได้' : 'โปรดยืนยันความเป็นเจ้าของอีเมลก่อนใช้บริการกู้คืนบัญชีผ่าน OTP'}</p></div>
        </div>

        <div className="profile-email-display"><Mail size={19} aria-hidden="true" /><span>{tenant?.email || 'ยังไม่มีอีเมล'}</span></div>
        {!verified && <button type="button" className="btn btn-primary" onClick={resend} disabled={resending || !tenant?.email}>{resending ? 'กำลังส่งลิงก์...' : 'ส่งลิงก์ยืนยันอีเมล'}</button>}

        {message && <p className="profile-feedback ok" role="status">{message}</p>}
        {error && <p className="profile-feedback error" role="alert">{error}</p>}
      </section>

      <section className="card card-pad profile-card">
        <h3>เปลี่ยนอีเมล</h3>
        <p className="profile-card-copy">เมื่อเปลี่ยนอีเมล สถานะยืนยันเดิมจะถูกยกเลิก และระบบจะส่งลิงก์ยืนยันไปยังอีเมลใหม่</p>
        <form className="profile-email-form" onSubmit={changeEmail}>
          <div className="field"><label htmlFor="profile-email">อีเมล</label><input id="profile-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <button type="submit" className="btn btn-ghost" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกอีเมลใหม่'}</button>
        </form>
      </section>
    </div>
  );
}
