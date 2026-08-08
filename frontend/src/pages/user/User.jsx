import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function User() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="app-shell active" id="shell-resident">
      <div className="sidebar">
        <div className="brandmark">
          <div className="fob"></div>
          <div className="name">
            NestKey<small>พอร์ทัลลูกบ้าน</small>
          </div>
        </div>
        <div className="role-pill">เมนูลูกบ้าน</div>
        <ul className="nav" id="nav-resident">
          <li>
            <NavLink
              to="/user"
              end
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">⌂</span>หน้าหลัก
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user/repair"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">🔧</span>แจ้งซ่อม
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user/complaint"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">✎</span>ร้องเรียน
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user/payment"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">฿</span>ชำระค่าเช่า / ค่าน้ำไฟ
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user/parcel"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">📦</span>พัสดุของฉัน
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user/announcement"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">🔔</span>ประกาศข่าวสาร
            </NavLink>
          </li>
        </ul>
        <div className="sidebar-foot">
          <button onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </div>
      <div className="main">
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
              ห้อง A12 · ตึก A ชั้น 1
            </div>
          </div>
          <div className="who">
            <div className="bell">
              <span className="ic">🔔</span>
              <span className="dot"></span>
            </div>
            <div className="avatar">ณช</div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}