import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, House, MessageCircle, Package, Wallet, Wrench, FileText } from 'lucide-react';

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
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [noticeOpen, setNoticeOpen] = useState(false);
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
  useEffect(() => {
    const loadNotifications = async () => { try { const result = await fetch('http://localhost:4000/api/notifications', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); const data = await result.json(); if (data.success) { setNotifications(data.data || []); setUnread(data.unreadCount || 0); } } catch { /* next poll retries */ } };
    loadNotifications(); const timer = setInterval(loadNotifications, 30000); return () => clearInterval(timer);
  }, []);
  const openNotification = async (item) => { try { await fetch(`http://localhost:4000/api/notifications/${item.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); setUnread((count) => Math.max(0, count - (item.read_at ? 0 : 1))); setNotifications((list) => list.map((n) => n.id === item.id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)); } finally { setNoticeOpen(false); navigate(item.destination || '/user'); } };

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
        <NavLink to="/user" end className="resident-brand" aria-label="KPN Haven หน้าหลัก">
          <span className="resident-brand-mark">K</span><span>KPN Haven</span>
        </NavLink>
        <nav className="resident-nav" aria-label="เมนูผู้พักอาศัย">
          {navigation.map((item) => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.end}><Icon aria-hidden="true" size={20} strokeWidth={2} />{item.label}</NavLink>;
          })}
        </nav>
        <div className="resident-account">
          <div className="resident-notification-wrap"><button className="resident-notice" type="button" onClick={() => setNoticeOpen((open) => !open)} aria-label="การแจ้งเตือน"><Bell size={21} />{unread > 0 && <i>{unread > 99 ? '99+' : unread}</i>}</button>{noticeOpen && <section className="notification-dropdown"><header><b>การแจ้งเตือน</b><button onClick={() => { setNoticeOpen(false); navigate('/user/notifications'); }}>ดูทั้งหมด</button></header>{notifications.slice(0, 4).map((item) => <button className={`notification-mini ${item.read_at ? '' : 'unread'}`} key={item.id} onClick={() => openNotification(item)}><FileText size={18}/><span><b>{item.title}</b><small>{new Date(item.created_at).toLocaleString('th-TH')}</small></span></button>)}{!notifications.length && <p>ยังไม่มีการแจ้งเตือน</p>}<button className="notification-all" onClick={() => { setNoticeOpen(false); navigate('/user/notifications'); }}>ดูการแจ้งเตือนทั้งหมด →</button></section>}</div>
          <button className="resident-avatar resident-profile-trigger" type="button" onClick={() => navigate('/user/profile')} aria-label="ข้อมูลบัญชีของฉัน">{getAvatar()}</button>
          <button className="resident-logout" type="button" onClick={handleLogout}>ออกจากระบบ</button>
        </div>
      </header>
      <main className="resident-main"><Outlet context={{ tenant, room, notifications, unread, updateTenant: setTenant }} /></main>
      <nav className="resident-mobile-nav" aria-label="เมนูผู้พักอาศัยบนมือถือ">
        {navigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return <NavLink key={item.to} to={item.to} end={item.end}><Icon aria-hidden="true" size={20} strokeWidth={2} />{item.label}</NavLink>;
        })}
      </nav>
    </div>
  );
}
