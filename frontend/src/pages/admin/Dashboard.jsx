import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Grid2X2,
  Phone,
  Plus,
  Wrench,
} from 'lucide-react';

const API = 'http://localhost:4000/api/dashboard';

const roomPresentation = (status) => {
  if (status === 'ว่าง') return { key: 'available', label: 'ห้องว่าง' };
  if (status === 'แจ้งซ่อม') return { key: 'maintenance', label: 'อยู่ระหว่างแจ้งซ่อม' };
  if (status === 'ค้างชำระ') return { key: 'overdue', label: 'ค้างชำระค่าเช่า' };
  return { key: 'occupied', label: 'มีผู้พักอาศัย' };
};

const SummaryCard = ({ icon: Icon, title, value, label, tone }) => (
  <article className={`overview-dashboard__stat overview-dashboard__stat--${tone}`}>
    <div className="overview-dashboard__stat-title">
      <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
      <span>{title}</span>
    </div>
    <div className="overview-dashboard__stat-value">
      <strong>{value}</strong>
      {label && <span className="overview-dashboard__status-pill">{label}</span>}
    </div>
    <div className="overview-dashboard__stat-line" aria-hidden="true"><i /></div>
  </article>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState([]);
  const [summary, setSummary] = useState({
    totalRooms: 0,
    availableRooms: 0,
    maintenanceRooms: 0,
    overduePayments: 0,
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        const response = await fetch(API, { signal: controller.signal });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'ไม่สามารถโหลดข้อมูลภาพรวมได้');
        }

        setRoomData(data.rooms || []);
        setSummary(data.summary || {
          totalRooms: 0,
          availableRooms: 0,
          maintenanceRooms: 0,
          overduePayments: 0,
        });
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error('Dashboard API Error:', loadError);
          setError(loadError.message || 'ไม่สามารถโหลดข้อมูลภาพรวมได้');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, []);

  const floors = useMemo(
    () => [...new Set(roomData.map((room) => room.floor).filter(Boolean))]
      .sort((first, second) => Number(first) - Number(second)),
    [roomData],
  );

  const filteredRooms = selectedFloor === 'all'
    ? roomData
    : roomData.filter((room) => String(room.floor) === selectedFloor);

  if (loading) {
    return <div className="overview-dashboard__state">กำลังโหลดภาพรวมระบบ...</div>;
  }

  if (error) {
    return (
      <div className="overview-dashboard__state overview-dashboard__state--error">
        <p>ไม่สามารถโหลดข้อมูลภาพรวมได้</p>
        <small>{error}</small>
        <button type="button" onClick={() => window.location.reload()}>ลองใหม่</button>
      </div>
    );
  }

  return (
    <div className="overview-dashboard">
      <header className="overview-dashboard__page-header">
        <div>
          <nav className="overview-dashboard__breadcrumb" aria-label="เส้นทางนำทาง">
            <span>ระบบหลังบ้าน</span>
            <ChevronRight aria-hidden="true" size={14} />
            <b>ภาพรวมระบบ</b>
          </nav>
          <h1>สถานะห้องพักและรายละเอียดผู้พักอาศัย</h1>
          <p>คลิกที่ป้ายห้องเพื่อดูรายละเอียดผู้พักอาศัยและสถานะล่าสุดของแต่ละห้อง</p>
        </div>
        <button
          type="button"
          className="overview-dashboard__add-button"
          onClick={() => navigate('/admin/room')}
        >
          <Plus aria-hidden="true" size={19} />
          เพิ่มห้องพักใหม่
        </button>
      </header>

      <section className="overview-dashboard__stats" aria-label="สรุปสถานะห้องพัก">
        <SummaryCard icon={Building2} title="ห้องทั้งหมด" value={summary.totalRooms} label="ห้องในระบบ" tone="all" />
        <SummaryCard icon={Grid2X2} title="ห้องว่าง" value={summary.availableRooms} label="พร้อมปล่อยเช่า" tone="available" />
        <SummaryCard icon={Wrench} title="แจ้งซ่อมค้าง" value={summary.maintenanceRooms} label="รอดำเนินการ" tone="maintenance" />
        <SummaryCard icon={CreditCard} title="ค้างชำระ" value={summary.overduePayments} label="เกินกำหนด" tone="overdue" />
      </section>

      <section className="overview-dashboard__rooms" aria-labelledby="overview-rooms-title">
        <header className="overview-dashboard__rooms-header">
          <div className="overview-dashboard__heading">
            <span className="overview-dashboard__heading-icon"><Grid2X2 aria-hidden="true" size={21} /></span>
            <h1 id="overview-rooms-title">ผังห้องพัก</h1>
          </div>
          <label className="overview-dashboard__floor-select">
            <span className="sr-only">เลือกชั้น</span>
            <select value={selectedFloor} onChange={(event) => setSelectedFloor(event.target.value)}>
              <option value="all">แสดงห้องทั้งหมด</option>
              {floors.map((floor) => <option key={floor} value={floor}>ชั้น {floor}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={17} />
          </label>
        </header>

        <div className="overview-dashboard__room-grid">
          {filteredRooms.map((room) => {
            const presentation = roomPresentation(room.status);
            return (
              <button
                key={room.id}
                type="button"
                className={`overview-dashboard__room overview-dashboard__room--${presentation.key}`}
                onClick={() => setSelectedRoom(room)}
              >
                <strong>{room.roomNumber}</strong>
                <span>{presentation.label}</span>
              </button>
            );
          })}

          <button type="button" className="overview-dashboard__add-room" onClick={() => navigate('/admin/room')}>
            <span><Plus aria-hidden="true" size={22} /></span>
            เพิ่มห้อง
          </button>
        </div>

        <footer className="overview-dashboard__legend" aria-label="คำอธิบายสถานะห้องพัก">
          <span className="overview-dashboard__legend-item overview-dashboard__legend-item--available">ห้องว่าง</span>
          <span className="overview-dashboard__legend-item overview-dashboard__legend-item--occupied">มีผู้พักอาศัย</span>
          <span className="overview-dashboard__legend-item overview-dashboard__legend-item--maintenance">อยู่ระหว่างแจ้งซ่อม</span>
          <span className="overview-dashboard__legend-item overview-dashboard__legend-item--overdue">ค้างชำระค่าเช่า</span>
        </footer>
      </section>

      <aside className="overview-dashboard__support">
        <CircleAlert aria-hidden="true" size={29} />
        <div>
          <h2>ต้องการความช่วยเหลือด่วนสำหรับการดูแล?</h2>
          <p>หากมีเหตุฉุกเฉินระดับอาคาร เช่น ระบบไฟฟ้าขัดข้องส่วนกลาง หรือน้ำรั่วในพื้นที่ส่วนกลาง โปรดติดต่อศูนย์ควบคุมส่วนกลางทันที</p>
        </div>
        <a href="tel:021234567"><Phone aria-hidden="true" size={19} /> สายด่วนเจ้าหน้าที่: 02-123-4567</a>
      </aside>

      {selectedRoom && (
        <div className="modal-overlay active" onClick={() => setSelectedRoom(null)}>
          <section className="modal overview-dashboard__modal" onClick={(event) => event.stopPropagation()} aria-label={`รายละเอียดห้อง ${selectedRoom.roomNumber}`}>
            <h2>ห้อง {selectedRoom.roomNumber}</h2>
            <dl>
              <div><dt>สถานะ</dt><dd><span className={`overview-dashboard__modal-status overview-dashboard__modal-status--${roomPresentation(selectedRoom.status).key}`}>{selectedRoom.status}</span></dd></div>
              <div><dt>ผู้พักอาศัย</dt><dd>{selectedRoom.tenant}</dd></div>
              <div><dt>เบอร์ติดต่อ</dt><dd>{selectedRoom.phone}</dd></div>
              <div><dt>ค่าเช่า/เดือน</dt><dd>฿{Number(selectedRoom.rent || 0).toLocaleString()}</dd></div>
              <div><dt>สถานะการชำระเงิน</dt><dd>{selectedRoom.payStatus}</dd></div>
            </dl>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedRoom(null)}>ปิด</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/admin/room')}>จัดการห้องพัก</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
