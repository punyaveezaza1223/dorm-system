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
      setMessage(
        'กรุณากรอกเบอร์โทรศัพท์ / อีเมล / Username และรหัสผ่าน'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        'http://localhost:4000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // สำคัญ:
            // Backend ใช้ชื่อ login ไม่ใช่ identifier
            login: loginData.identifier,

            password: loginData.password,

            // resident ใน Frontend = tenant ใน Database
            role: role === 'resident' ? 'tenant' : 'admin',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.message ||
            'เบอร์โทรศัพท์ / อีเมล / Username หรือรหัสผ่านไม่ถูกต้อง'
        );
        return;
      }

      // =================================
      // เก็บ Token
      // =================================

      localStorage.setItem(
        'token',
        result.token
      );

      // =================================
      // เก็บข้อมูล User
      // =================================

      localStorage.setItem(
        'user',
        JSON.stringify(result.user)
      );

      // =================================
      // เข้า Dashboard ตาม Role
      // =================================

      if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }

    } catch (error) {
      console.error('Login Error:', error);

      setMessage(
        'ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบ Server'
      );
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
      setMessage(
        'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      );
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

            // ตอนนี้ Backend Register API
            // ยังไม่ได้ใช้ roomNumber
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
        setMessage(
          result.message ||
            'สมัครสมาชิกไม่สำเร็จ'
        );
        return;
      }

      // =================================
      // สมัครสำเร็จ
      // =================================

      alert(
        'สมัครสมาชิกเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ'
      );

      // ล้างข้อมูล
      setRegisterData({
        firstName: '',
        lastName: '',
        roomNumber: '',
        phone: '',
        email: '',
        username: '',
        password: '',
      });

      // กลับ Login
      setAuthTab('login');

      // เอา Username ที่สมัคร
      // มาใส่ช่อง Login
      setLoginData({
        identifier: registerData.username,
        password: '',
      });

      setMessage(
        'สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ'
      );

    } catch (error) {
      console.error(
        'Register Error:',
        error
      );

      setMessage(
        'ไม่สามารถเชื่อมต่อ Backend ได้ กรุณาตรวจสอบ Server'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="screen-login">

      <div class="login-wrap">

        {/* ================================= */}
        {/* LEFT SIDE */}
        {/* ================================= */}

        <div class="login-side">

          <div class="brandmark">

            <div class="fob"></div>

            <div
              class="name"
              style={{ color: '#fff' }}
            >
              NestKey

              <small
                style={{
                  color:
                    'rgba(255,255,255,.55)',
                }}
              >
                ระบบจัดการหอพักและคอนโด
              </small>
            </div>

          </div>

          <h1>
            ดูแลบ้านของลูกบ้าน<br />
            จัดการหอพักของคุณ ในที่เดียว
          </h1>

          <p>
            แจ้งซ่อม ร้องเรียน ชำระค่าเช่า
            ติดตามพัสดุ และรับข่าวสาร —
            ครบในระบบเดียวสำหรับลูกบ้านและผู้ดูแล
          </p>

          <div class="keytag-stack">

            <div class="keytag rot1">

              <span
                class="dot"
                style={{
                  background:
                    'var(--sage)',
                }}
              ></span>

              <span class="num">
                A12
              </span>

            </div>

            <div class="keytag rot2">

              <span
                class="dot"
                style={{
                  background:
                    'var(--brass)',
                }}
              ></span>

              <span class="num">
                B04
              </span>

            </div>

            <div class="keytag rot3">

              <span
                class="dot"
                style={{
                  background:
                    'var(--rust)',
                }}
              ></span>

              <span class="num">
                C09
              </span>

            </div>

          </div>

          <div class="pegrow"></div>

        </div>

        {/* ================================= */}
        {/* RIGHT SIDE */}
        {/* ================================= */}

        <div class="login-form">

          {/* Login / Register Tab */}

          <div class="segment">

            <button
              class={
                authTab === 'login'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setAuthTab('login');
                setMessage('');
              }}
            >
              เข้าสู่ระบบ
            </button>

            <button
              class={
                authTab === 'register'
                  ? 'active'
                  : ''
              }
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
              style={{
                marginTop: '15px',
                marginBottom: '15px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#f5f1e8',
                color: '#5c5143',
                fontSize: '14px',
              }}
            >
              {message}
            </div>
          )}

          {/* ================================= */}
          {/* LOGIN */}
          {/* ================================= */}

          {authTab === 'login' && (

            <form
              id="pane-login"
              onSubmit={handleLogin}
            >

              <div class="field">

                <label>
                  เข้าสู่ระบบในฐานะ
                </label>

                <div
                  class="segment"
                  style={{
                    background: '#fff',
                    border:
                      '1.5px solid var(--line)',
                  }}
                >

                  <button
                    type="button"
                    class={
                      role === 'resident'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setRole('resident')
                    }
                  >
                    ลูกบ้าน
                  </button>

                  <button
                    type="button"
                    class={
                      role === 'admin'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setRole('admin')
                    }
                  >
                    ผู้ดูแล (Admin)
                  </button>

                </div>

              </div>

              <div class="field">

                <label>
                  เบอร์โทรศัพท์ / อีเมล / Username
                </label>

                <input
                  type="text"
                  name="identifier"
                  value={
                    loginData.identifier
                  }
                  onChange={
                    handleLoginChange
                  }
                  placeholder="เบอร์โทร / อีเมล / Username"
                />

              </div>

              <div class="field">

                <label>
                  รหัสผ่าน
                </label>

                <input
                  type="password"
                  name="password"
                  value={
                    loginData.password
                  }
                  onChange={
                    handleLoginChange
                  }
                  placeholder="••••••••"
                />

              </div>

              <button
                type="submit"
                class="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading
                  ? 'กำลังเข้าสู่ระบบ...'
                  : 'เข้าสู่ระบบ'}
              </button>

              <div class="switch-line">
                ลืมรหัสผ่าน?{' '}
                <b>
                  กู้คืนบัญชี
                </b>
              </div>

            </form>
          )}

          {/* ================================= */}
          {/* REGISTER */}
          {/* ================================= */}

          {authTab === 'register' && (

            <form
              id="pane-register"
              onSubmit={handleRegister}
            >

              {/* ชื่อ / นามสกุล */}

              <div
                class="grid-2"
                style={{
                  gap: '12px',
                }}
              >

                <div class="field">

                  <label>
                    ชื่อ
                  </label>

                  <input
                    type="text"
                    name="firstName"
                    value={
                      registerData.firstName
                    }
                    onChange={
                      handleRegisterChange
                    }
                    placeholder="ชื่อจริง"
                  />

                </div>

                <div class="field">

                  <label>
                    นามสกุล
                  </label>

                  <input
                    type="text"
                    name="lastName"
                    value={
                      registerData.lastName
                    }
                    onChange={
                      handleRegisterChange
                    }
                    placeholder="นามสกุล"
                  />

                </div>

              </div>

              {/* Username */}

              <div class="field">

                <label>
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  value={
                    registerData.username
                  }
                  onChange={
                    handleRegisterChange
                  }
                  placeholder="ตั้ง Username"
                />

              </div>

              {/* ห้อง */}

              <div class="field">

                <label>
                  เลขห้องพัก
                </label>

                <input
                  type="text"
                  name="roomNumber"
                  value={
                    registerData.roomNumber
                  }
                  onChange={
                    handleRegisterChange
                  }
                  placeholder="เช่น A12"
                />

              </div>

              {/* เบอร์ */}

              <div class="field">

                <label>
                  เบอร์โทรศัพท์
                </label>

                <input
                  type="text"
                  name="phone"
                  value={
                    registerData.phone
                  }
                  onChange={
                    handleRegisterChange
                  }
                  placeholder="08x-xxx-xxxx"
                />

              </div>

              {/* Email */}

              <div class="field">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    registerData.email
                  }
                  onChange={
                    handleRegisterChange
                  }
                  placeholder="example@email.com"
                />

              </div>

              {/* Password */}

              <div class="field">

                <label>
                  รหัสผ่าน
                </label>

                <input
                  type="password"
                  name="password"
                  value={
                    registerData.password
                  }
                  onChange={
                    handleRegisterChange
                  }
                  placeholder="ตั้งรหัสผ่าน"
                />

              </div>

              <button
                type="submit"
                class="btn btn-brass btn-block"
                disabled={loading}
              >
                {loading
                  ? 'กำลังสมัครสมาชิก...'
                  : 'สมัครสมาชิก'}
              </button>

              <div class="switch-line">

                มีบัญชีอยู่แล้ว?{' '}

                <b
                  onClick={() => {
                    setAuthTab('login');
                    setMessage('');
                  }}
                  style={{
                    cursor: 'pointer',
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