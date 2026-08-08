import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [authTab, setAuthTab] = useState('login');
  const [role, setRole] = useState('resident');

  const handleEnterApp = () => {
    if (role === 'resident') {
      navigate('/user');
    } else {
      navigate('/admin');
    }
  };

  return (
    <div id="screen-login">
      <div class="login-wrap">
        <div class="login-side">
          <div class="brandmark">
            <div class="fob"></div>
            <div class="name" style={{ color: '#fff' }}>
              NestKey
              <small style={{ color: 'rgba(255,255,255,.55)' }}>
                ระบบจัดการหอพักและคอนโด
              </small>
            </div>
          </div>
          <h1>
            ดูแลบ้านของลูกบ้าน<br />
            จัดการหอพักของคุณ ในที่เดียว
          </h1>
          <p>
            แจ้งซ่อม ร้องเรียน ชำระค่าเช่า ติดตามพัสดุ และรับข่าวสาร — ครบในระบบเดียวสำหรับลูกบ้านและผู้ดูแล
          </p>
          <div class="keytag-stack">
            <div class="keytag rot1">
              <span class="dot" style={{ background: 'var(--sage)' }}></span>
              <span class="num">A12</span>
            </div>
            <div class="keytag rot2">
              <span class="dot" style={{ background: 'var(--brass)' }}></span>
              <span class="num">B04</span>
            </div>
            <div class="keytag rot3">
              <span class="dot" style={{ background: 'var(--rust)' }}></span>
              <span class="num">C09</span>
            </div>
          </div>
          <div class="pegrow"></div>
        </div>

        <div class="login-form">
          <div class="segment">
            <button
              class={authTab === 'login' ? 'active' : ''}
              onClick={() => setAuthTab('login')}
            >
              เข้าสู่ระบบ
            </button>
            <button
              class={authTab === 'register' ? 'active' : ''}
              onClick={() => setAuthTab('register')}
            >
              สมัครสมาชิก
            </button>
          </div>

          {authTab === 'login' && (
            <div id="pane-login">
              <div class="field">
                <label>เข้าสู่ระบบในฐานะ</label>
                <div
                  class="segment"
                  style={{ background: '#fff', border: '1.5px solid var(--line)' }}
                >
                  <button
                    class={role === 'resident' ? 'active' : ''}
                    onClick={() => setRole('resident')}
                  >
                    ลูกบ้าน
                  </button>
                  <button
                    class={role === 'admin' ? 'active' : ''}
                    onClick={() => setRole('admin')}
                  >
                    ผู้ดูแล (Admin)
                  </button>
                </div>
              </div>
              <div class="field">
                <label>เบอร์โทรศัพท์ / อีเมล</label>
                <input type="text" placeholder="เช่น 081-234-5678" />
              </div>
              <div class="field">
                <label>รหัสผ่าน</label>
                <input type="password" placeholder="••••••••" />
              </div>
              <button class="btn btn-primary btn-block" onClick={handleEnterApp}>
                เข้าสู่ระบบ
              </button>
              <div class="switch-line">
                ลืมรหัสผ่าน? <b>กู้คืนบัญชี</b>
              </div>
            </div>
          )}

          {authTab === 'register' && (
            <div id="pane-register">
              <div class="grid-2" style={{ gap: '12px' }}>
                <div class="field">
                  <label>ชื่อ</label>
                  <input type="text" placeholder="ชื่อจริง" />
                </div>
                <div class="field">
                  <label>นามสกุล</label>
                  <input type="text" placeholder="นามสกุล" />
                </div>
              </div>
              <div class="field">
                <label>เลขห้องพัก</label>
                <input type="text" placeholder="เช่น A12" />
              </div>
              <div class="field">
                <label>เบอร์โทรศัพท์</label>
                <input type="text" placeholder="08x-xxx-xxxx" />
              </div>
              <div class="field">
                <label>รหัสผ่าน</label>
                <input type="password" placeholder="ตั้งรหัสผ่าน" />
              </div>
              <button class="btn btn-brass btn-block" onClick={() => setAuthTab('login')}>
                สมัครสมาชิก
              </button>
              <div class="switch-line">
                มีบัญชีอยู่แล้ว? <b onClick={() => setAuthTab('login')}>เข้าสู่ระบบ</b>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;