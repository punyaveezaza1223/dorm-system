import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function User() {
  const navigate = useNavigate();

  // =================================
  // Tenant Data
  // =================================

  const [tenant, setTenant] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  // =================================
  // ดึงข้อมูลลูกบ้าน
  // =================================

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        const token = localStorage.getItem('token');

        // ไม่มี Token = ยังไม่ได้ Login
        if (!token) {
          navigate('/');
          return;
        }

        const response = await fetch(
          'http://localhost:4000/api/tenant/me',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        // Token หมดอายุ / ไม่มีสิทธิ์
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          navigate('/');
          return;
        }

        if (!response.ok || !result.success) {
          console.error(
            'Tenant API Error:',
            result.message
          );

          return;
        }

        // ================================
        // เก็บข้อมูลลูกบ้าน
        // ================================

        setTenant(result.user);

        // ================================
        // เก็บข้อมูลห้อง
        // ================================

        setRoom(result.room);

      } catch (error) {
        console.error(
          'Fetch Tenant Error:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTenantData();
  }, [navigate]);

  // =================================
  // Logout
  // =================================

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    navigate('/');
  };

  // =================================
  // Loading
  // =================================

  if (loading) {
    return (
      <div
        className="app-shell active"
        id="shell-resident"
      >
        <div className="sidebar">
          <div className="brandmark">
            <div className="fob"></div>

            <div className="name">
              NestKey
              <small>พอร์ทัลลูกบ้าน</small>
            </div>
          </div>

          <div className="role-pill">
            เมนูลูกบ้าน
          </div>
        </div>

        <div className="main">
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
            }}
          >
            กำลังโหลดข้อมูล...
          </div>
        </div>
      </div>
    );
  }

  // =================================
  // Avatar
  // =================================

  const getAvatar = () => {
    if (!tenant?.fullName) {
      return '—';
    }

    const name = tenant.fullName.trim();

    const parts = name.split(' ');

    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
    }

    return name.substring(0, 2);
  };

  // =================================
  // Room Information
  // =================================

  const roomInfo = room
    ? `ห้อง ${room.room_number} · ชั้น ${room.floor}`
    : 'ยังไม่มีห้องพัก';

  return (
    <div
      className="app-shell active"
      id="shell-resident"
    >

      {/* ================================= */}
      {/* Sidebar */}
      {/* ================================= */}

      <div className="sidebar">

        <div className="brandmark">

          <div className="fob"></div>

          <div className="name">
            NestKey
            <small>พอร์ทัลลูกบ้าน</small>
          </div>

        </div>

        <div className="role-pill">
          เมนูลูกบ้าน
        </div>

        <ul
          className="nav"
          id="nav-resident"
        >

          <li>
            <NavLink
              to="/user"
              end
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span className="ic">⌂</span>
              หน้าหลัก
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/user/repair"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span className="ic">🔧</span>
              แจ้งซ่อม
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/user/complaint"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span className="ic">✎</span>
              ร้องเรียน
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/user/payment"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span className="ic">฿</span>
              ชำระค่าเช่า / ค่าน้ำไฟ
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/user/parcel"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span className="ic">📦</span>
              พัสดุของฉัน
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/user/announcement"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span className="ic">🔔</span>
              ประกาศข่าวสาร
            </NavLink>
          </li>

        </ul>

        <div className="sidebar-foot">

          <button onClick={handleLogout}>
            ออกจากระบบ
          </button>

        </div>

      </div>

      {/* ================================= */}
      {/* Main */}
      {/* ================================= */}

      <div className="main">

        {/* ================================= */}
        {/* Topbar */}
        {/* ================================= */}

        <div className="topbar">

          <div>

            <div
              className="eyebrow"
              style={{
                fontSize: '12px',
                color: 'var(--text-faint)',
                fontWeight: 600,
              }}
            >
              {roomInfo}
            </div>

          </div>

          <div className="who">

            <div className="bell">

              <span className="ic">
                🔔
              </span>

              <span className="dot"></span>

            </div>

            <div className="avatar">
              {getAvatar()}
            </div>

          </div>

        </div>

        {/* ================================= */}
        {/* Child Pages */}
        {/* ================================= */}

        <Outlet
          context={{
            tenant,
            room,
          }}
        />

      </div>

    </div>
  );
}