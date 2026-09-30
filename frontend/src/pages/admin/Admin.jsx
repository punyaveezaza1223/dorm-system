import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, ClipboardList, House, Megaphone, Package, ReceiptText, Settings, Wrench } from 'lucide-react';

const navigation = [
  { to: '/admin', label: 'ภาพรวม', icon: House, end: true },
  { to: '/admin/room', label: 'จัดการห้องพัก', icon: ClipboardList },
  { to: '/admin/payment', label: 'ตรวจสอบการชำระเงิน', icon: ReceiptText },
  { to: '/admin/repair', label: 'จัดการงานแจ้งซ่อม', icon: Wrench },
  { to: '/admin/utility', label: 'ค่าน้ำ ค่าไฟ', icon: Settings },
  { to: '/admin/parcel', label: 'จัดการพัสดุ', icon: Package },
  { to: '/admin/announcement', label: 'ประกาศข่าวสาร', icon: Megaphone },
];

export default function Admin() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="admin-shell" id="shell-admin">
      <header className="admin-header">
        <NavLink to="/admin" end className="admin-brand" aria-label="KPN Haven หน้าหลักผู้ดูแล">
          <span className="admin-brand-mark">K</span><span>KPN Haven</span>
        </NavLink>
        <nav className="admin-nav" aria-label="เมนูผู้ดูแล">
          {navigation.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.end}><Icon aria-hidden="true" size={19} strokeWidth={2} />{item.label}</NavLink>;
          })}
        </nav>
        <div className="admin-account">
          <button className="admin-notice" type="button" aria-label="การแจ้งเตือน"><Bell aria-hidden="true" size={18} /><i /></button>
          <div className="admin-avatar">AD</div>
          <button className="admin-logout" type="button" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </header>
      <main className="admin-main"><Outlet /></main>
      <nav className="admin-mobile-nav" aria-label="เมนูผู้ดูแลบนมือถือ">
        {navigation.map((item) => {
          const Icon = item.icon;
          return <NavLink key={item.to} to={item.to} end={item.end}><Icon aria-hidden="true" size={19} strokeWidth={2} /><span>{item.label}</span></NavLink>;
        })}
      </nav>
    </div>
  );
}
