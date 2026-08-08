import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function Admin() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="app-shell active" id="shell-admin">
      <div className="sidebar">
        <div className="brandmark">
          <div className="fob"></div>
          <div className="name">
            NestKey<small>สำหรับผู้ดูแล</small>
          </div>
        </div>
        <div className="role-pill">เมนูผู้ดูแล</div>
        <ul className="nav" id="nav-admin">
          <li>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">⌂</span>ภาพรวม
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/room"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">🏷</span>จัดการข้อมูลห้องพัก
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/payment"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">฿</span>ตรวจสอบการชำระเงิน
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/repair"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">🔧</span>จัดการงานแจ้งซ่อม
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/utility"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">💧</span>ค่าน้ำ ค่าไฟ ส่วนกลาง
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/announcement"
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="ic">📣</span>ประกาศข่าวสาร
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
              NestKey Residence · ผู้ดูแลระบบ
            </div>
          </div>
          <div className="who">
            <div className="bell">
              <span className="ic">🔔</span>
              <span className="dot"></span>
            </div>
            <div className="avatar">AD</div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}