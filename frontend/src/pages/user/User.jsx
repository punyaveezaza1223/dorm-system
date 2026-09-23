import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, House, MessageCircle, Package, Wallet, Wrench } from 'lucide-react';

const navigation = [
  { to: '/user', label: 'หน้าหลัก', icon: House, end: true },
  { to: '/user/repair', label: 'แจ้งซ่อม', icon: Wrench },
  { to: '/user/complaint', label: 'ติดต่อผู้ดูแล', icon: MessageCircle },
  { to: '/user/payment', label: 'ชำระเงิน', icon: Wallet },
  { to: '/user/parcel', label: 'พัสดุ', icon: Package },
  { to: '/user/announcement', label: 'ข่าวสาร', icon: Bell },
];

export default function User() {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');

        const response = await fetch('http://localhost:4000/api/tenant/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return navigate('/');
        }
        if (!response.ok || !result.success) {
          console.error('Tenant API Error:', result.message);
          return;
        }
        setTenant(result.user);
        setRoom(result.room);
      } catch (error) {
        console.error('Fetch Tenant Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getAvatar = () => {
    if (!tenant?.fullName) return '—';
    const parts = tenant.fullName.trim().split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].substring(0, 2);
  };

  if (loading) return <div id="shell-resident" className="resident-shell resident-loading">กำลังโหลดข้อมูล...</div>;

  return (
    <div id="shell-resident" className="resident-shell">
      <header className="resident-header">
        <NavLink to="/user" end className="resident-brand" aria-label="NestKey หน้าหลัก">
          <span className="resident-brand-mark">N</span><span>NestKey</span>
        </NavLink>
        <nav className="resident-nav" aria-label="เมนูผู้พักอาศัย">
          {navigation.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.end}><Icon aria-hidden="true" size={20} strokeWidth={2} />{item.label}</NavLink>;
          })}
        </nav>
        <div className="resident-account">
          <button className="resident-notice" type="button" aria-label="การแจ้งเตือน">♧<i /></button>
          <div className="resident-avatar">{getAvatar()}</div>
          <button className="resident-logout" type="button" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </header>
      <main className="resident-main"><Outlet context={{ tenant, room }} /></main>
      <nav className="resident-mobile-nav" aria-label="เมนูผู้พักอาศัยบนมือถือ">
        {navigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return <NavLink key={item.to} to={item.to} end={item.end}><Icon aria-hidden="true" size={20} strokeWidth={2} />{item.label}</NavLink>;
        })}
      </nav>
    </div>
  );
}
