import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, FileText, Megaphone, Package, Wrench } from 'lucide-react';

const API = 'http://localhost:4000/api';
const icons = { invoice: FileText, payment: FileText, repair: Wrench, parcel: Package, announcement: Megaphone };
const filters = [['all', 'ทั้งหมด'], ['unread', 'ไม่ได้อ่าน'], ['repair', 'แจ้งซ่อม'], ['parcel', 'พัสดุ'], ['announcement', 'ประกาศ'], ['invoice', 'ใบแจ้งหนี้']];
export default function Notifications() {
  const [items, setItems] = useState([]); const [filter, setFilter] = useState('all'); const navigate = useNavigate(); const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
  const load = async () => { const r = await fetch(`${API}/notifications?filter=${filter}`, { headers }); const d = await r.json(); if (d.success) setItems(d.data || []); };
  useEffect(() => { load().catch(console.error); }, [filter]);
  const readAll = async () => { await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers }); await load(); };
  const open = async (item) => { await fetch(`${API}/notifications/${item.id}`, { headers }); navigate(`/user/notifications/${item.id}`); };
  return <div className="notifications-page"><header><div><span>การแจ้งเตือน</span><h1>การแจ้งเตือนทั้งหมด</h1></div><button onClick={readAll}>✓ ทำเครื่องหมายว่าอ่านทั้งหมด</button></header><nav>{filters.map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</nav><section>{items.map((item) => { const Icon = icons[item.type] || Bell; return <button className={`notification-row ${item.read_at ? '' : 'unread'}`} key={item.id} onClick={() => open(item)}><span className={`notification-type ${item.type}`}><Icon /></span><span><b>{item.title}</b><small>{item.body}</small></span><time>{new Date(item.created_at).toLocaleString('th-TH')}</time>{!item.read_at && <i />}</button>; })}{!items.length && <p className="notifications-empty">ยังไม่มีการแจ้งเตือนในหมวดนี้</p>}</section></div>;
}

export function NotificationDetail() {
  const [item, setItem] = useState(null); const navigate = useNavigate(); const id = location.pathname.split('/').pop();
  useEffect(() => { fetch(`${API}/notifications/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => r.json()).then((d) => setItem(d.data)); }, [id]);
  if (!item) return <div className="notifications-page">กำลังโหลด…</div>;
  const Icon = icons[item.type] || Bell;
  return <div className="notification-detail"><button onClick={() => navigate('/user/notifications')}>← กลับ</button><h1>รายละเอียดการแจ้งเตือน</h1><article><span className={`notification-type ${item.type}`}><Icon /></span><h2>{item.title}</h2><time>{new Date(item.created_at).toLocaleString('th-TH')}</time><p>{item.body}</p>{item.destination && <button className="notification-go" onClick={() => navigate(item.destination)}>{item.type === 'repair' ? 'ดูรายละเอียดแจ้งซ่อม' : 'ไปหน้าที่เกี่ยวข้อง'} →</button>}</article></div>;
}
