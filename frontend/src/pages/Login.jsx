import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  const [authTab, setAuthTab] = useState('login');
  const [role, setRole] = useState('resident');

  // ================================
  // Login State
  // ================================

  const [loginData, setLoginData] = useState({
    identifier: '',
    password: '',
  });

  // ================================
  // Register State
  // ================================

  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    roomNumber: '',
    phone: '',
    email: '',
    username: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // ข้อความสำเร็จแสดงเป็นสีเขียว ข้อความอื่นแสดงเป็นสีแดง
  const isSuccessMessage = message.startsWith('สมัครสมาชิกสำเร็จ');

  // =================================
  // Login Input
  // =================================

  const handleLoginChange = (e) => {
    const { name, value } = e.target;

    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =================================
  // Register Input
  // =================================

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;

    setRegisterData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =================================
  // Login
  // =================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage('');

    if (!loginData.identifier || !loginData.password) {
      setMessage('กรุณากรอกเบอร์โทรศัพท์ / อีเมล / Username และรหัสผ่าน');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: loginData.identifier,
          password: loginData.password,
          role: role === 'resident' ? 'tenant' : 'admin',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.message ||
            'เบอร์โทรศัพท์ / อีเมล / Username หรือรหัสผ่านไม่ถูกต้อง'
        );
        return;
      }

      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));

      if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (error) {
      console.error('Login Error:', error);
      setMessage('ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบ Server');
    } finally {
      setLoading(false);
    }
  };

  // =================================
  // Register
  // =================================

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage('');

    if (
      !registerData.firstName ||
      !registerData.lastName ||
      !registerData.roomNumber ||
      !registerData.phone ||
      !registerData.email ||
      !registerData.username ||
      !registerData.password
    ) {
      setMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (registerData.password.length < 6) {
      setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        'http://localhost:4000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstName: registerData.firstName,
            lastName: registerData.lastName,
            roomNumber: registerData.roomNumber,
            phone: registerData.phone,
            email: registerData.email,
            username: registerData.username,
            password: registerData.password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(result.message || 'สมัครสมาชิกไม่สำเร็จ');
        return;
      }

      alert('สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ');

      setRegisterData({
        firstName: '',
        lastName: '',
        roomNumber: '',
        phone: '',
        email: '',
        username: '',
        password: '',
      });

      setAuthTab('login');
      setLoginData({
        identifier: registerData.username,
        password: '',
      });

      setMessage('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ');
    } catch (error) {
      console.error('Register Error:', error);
      setMessage('ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบ Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="screen-login">
      <div className="login-wrap">
        {/* ================================= */}
        {/* LEFT SIDE */}
        {/* ================================= */}

        <div className="login-side">
          <div className="brandmark">
            <div className="fob"></div>

            <div className="name" style={{ color: '#fff' }}>
              NestKey
              <small style={{ color: 'rgba(255,255,255,.85)' }}>
                ระบบจัดการหอพักและคอนโด
              </small>
            </div>
          </div>

          <h1>
            ดูแลบ้านของลูกบ้าน
            <br />
            จัดการหอพักของคุณ ในที่เดียว
          </h1>

          <p>
            — แจ้งซ่อม ร้องเรียน ชำระค่าเช่า ติดตามพัสดุ และรับข่าวสารทั้งหมด 
            — ครบในระบบเดียวสำหรับลูกบ้านและผู้ดูแล
          </p>

          <ul className="feature-chips">
            <li>แจ้งซ่อม</li>
            <li>ร้องเรียน</li>
            <li>ชำระค่าเช่า</li>
            <li>ติดตามพัสดุ</li>
            <li>ข่าวสาร</li>
          </ul>

          <div className="pegrow"></div>
        </div>

        {/* ================================= */}
        {/* RIGHT SIDE */}
        {/* ================================= */}

        <div className="login-form">
          <div className="form-head">
            <h2 className="form-title">
              {authTab === 'login' ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีลูกบ้าน'}
            </h2>
            <p className="form-sub">
              {authTab === 'login'
                ? 'เข้าสู่ระบบเพื่อจัดการห้องพักของคุณ'
                : 'กรอกข้อมูลด้านล่างเพื่อเริ่มใช้งาน'}
            </p>
          </div>

          {/* Login / Register Tab */}

          <div className="segment">
            <button
              type="button"
              className={authTab === 'login' ? 'active' : ''}
              onClick={() => {
                setAuthTab('login');
                setMessage('');
              }}
            >
              เข้าสู่ระบบ
            </button>

            <button
              type="button"
              className={authTab === 'register' ? 'active' : ''}
              onClick={() => {
                setAuthTab('register');
                setMessage('');
              }}
            >
              สมัครสมาชิก
            </button>
          </div>

          {/* ================================= */}
          {/* Message */}
          {/* ================================= */}

          {message && (
            <div
              className={`form-message ${isSuccessMessage ? 'ok' : 'error'}`}
              role="alert"
            >
              {message}
            </div>
          )}

          {/* ================================= */}
          {/* LOGIN */}
          {/* ================================= */}

          {authTab === 'login' && (
            <form id="pane-login" onSubmit={handleLogin}>
              <div className="field">
                <label>เข้าสู่ระบบในฐานะ</label>

                <div className="segment segment-role">
                  <button
                    type="button"
                    className={role === 'resident' ? 'active' : ''}
                    onClick={() => setRole('resident')}
                  >
                    ลูกบ้าน
                  </button>

                  <button
                    type="button"
                    className={role === 'admin' ? 'active' : ''}
                    onClick={() => setRole('admin')}
                  >
                    ผู้ดูแล (Admin)
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="login-identifier">
                  เบอร์โทรศัพท์ / อีเมล / Username
                </label>

                <input
                  id="login-identifier"
                  type="text"
                  name="identifier"
                  autoComplete="username"
                  value={loginData.identifier}
                  onChange={handleLoginChange}
                  placeholder="เบอร์โทร / อีเมล / Username"
                />
              </div>

              <div className="field">
                <label htmlFor="login-password">รหัสผ่าน</label>

                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>

              <div className="switch-line">
                ลืมรหัสผ่าน? <b>กู้คืนบัญชี</b>
              </div>
            </form>
          )}

          {/* ================================= */}
          {/* REGISTER */}
          {/* ================================= */}

          {authTab === 'register' && (
            <form id="pane-register" onSubmit={handleRegister}>
              {/* ชื่อ / นามสกุล */}

              <div className="form-row">
                <div className="field">
                  <label htmlFor="reg-firstName">ชื่อ</label>

                  <input
                    id="reg-firstName"
                    type="text"
                    name="firstName"
                    value={registerData.firstName}
                    onChange={handleRegisterChange}
                    placeholder="ชื่อจริง"
                  />
                </div>

                <div className="field">
                  <label htmlFor="reg-lastName">นามสกุล</label>

                  <input
                    id="reg-lastName"
                    type="text"
                    name="lastName"
                    value={registerData.lastName}
                    onChange={handleRegisterChange}
                    placeholder="นามสกุล"
                  />
                </div>
              </div>

              {/* Username */}

              <div className="field">
                <label htmlFor="reg-username">Username</label>

                <input
                  id="reg-username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={registerData.username}
                  onChange={handleRegisterChange}
                  placeholder="ตั้ง Username"
                />
              </div>

              {/* ห้อง / เบอร์ */}

              <div className="form-row">
                <div className="field">
                  <label htmlFor="reg-roomNumber">เลขห้องพัก</label>

                  <input
                    id="reg-roomNumber"
                    type="text"
                    name="roomNumber"
                    value={registerData.roomNumber}
                    onChange={handleRegisterChange}
                    placeholder="เช่น A12"
                  />
                </div>

                <div className="field">
                  <label htmlFor="reg-phone">เบอร์โทรศัพท์</label>

                  <input
                    id="reg-phone"
                    type="text"
                    name="phone"
                    value={registerData.phone}
                    onChange={handleRegisterChange}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>

              {/* Email */}

              <div className="field">
                <label htmlFor="reg-email">Email</label>

                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  placeholder="example@email.com"
                />
              </div>

              {/* Password */}

              <div className="field">
                <label htmlFor="reg-password">รหัสผ่าน</label>

                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={registerData.password}
                  onChange={handleRegisterChange}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>

              <button
                type="submit"
                className="btn btn-brass btn-block"
                disabled={loading}
              >
                {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
              </button>

              <div className="switch-line">
                มีบัญชีอยู่แล้ว?{' '}
                <b
                  onClick={() => {
                    setAuthTab('login');
                    setMessage('');
                  }}
                >
                  เข้าสู่ระบบ
                </b>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;