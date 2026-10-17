import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MessageCircle, Package, Wallet, Wrench } from 'lucide-react';

const formatDate = (date) => {
  if (!date) return '—';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const paymentStatus = (status) => {
  if (status === 'paid') {
    return {
      label: 'ชำระแล้ว',
      className: 'is-paid',
    };
  }

  if (status === 'overdue') {
    return {
      label: 'ค้างชำระ',
      className: 'is-overdue',
    };
  }

  return {
    label: 'รอตรวจสอบ',
    className: 'is-due',
  };
};

const repairStatus = (status) => {
  if (status === 'completed') {
    return {
      label: 'เสร็จสิ้น',
      className: 'is-paid',
    };
  }

  if (status === 'in_progress') {
    return {
      label: 'กำลังซ่อม',
      className: 'is-due',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'ยกเลิก',
      className: 'is-overdue',
    };
  }

  return {
    label: 'รอดำเนินการ',
    className: 'is-due',
  };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { tenant, room } = useOutletContext();

  const [payments, setPayments] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          return navigate('/');
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [
          paymentResponse,
          repairResponse,
          announcementResponse,
        ] = await Promise.all([
          fetch('http://localhost:4000/api/tenant/payments', {
            headers,
          }),

          fetch('http://localhost:4000/api/tenant/repairs', {
            headers,
          }),

          fetch('http://localhost:4000/api/announcements', {
            headers,
          }),
        ]);

        if (
          [
            paymentResponse.status,
            repairResponse.status,
            announcementResponse.status,
          ].some((status) => status === 401 || status === 403)
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          return navigate('/');
        }

        const [
          paymentResult,
          repairResult,
          announcementResult,
        ] = await Promise.all([
          paymentResponse.json(),
          repairResponse.json(),
          announcementResponse.json(),
        ]);

        console.log('Dashboard payments:', paymentResult);
        console.log('Dashboard repairs:', repairResult);
        console.log('Dashboard announcements:', announcementResult);

        if (paymentResult.success) {
          setPayments(paymentResult.data || []);
        }

        if (repairResult.success) {
          setRepairs(repairResult.data || []);
        }

        if (announcementResult.success) {
          setAnnouncements(announcementResult.data || []);
        }
      } catch (error) {
        console.error('Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  if (loading) {
    return (
      <div className="resident-dashboard resident-page-loading">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  const latestPayment = payments[0] || null;

  const amount = latestPayment
    ? Number(latestPayment.amount || 0)
    : Number(room?.contract_rent || room?.room_rent || 0);

  const roomName = room
    ? `ห้อง ${room.room_number} · ชั้น ${room.floor}`
    : 'ยังไม่มีข้อมูลห้องพัก';

  const dueDate = latestPayment?.due_date || latestPayment?.dueDate;

  const activeRepairs = repairs.filter(
    (item) =>
      item.status === 'pending' ||
      item.status === 'in_progress'
  );

  const latestRepair = repairs[0] || null;

  const latestRepairStatus = repairStatus(
    latestRepair?.status
  );

  return (
    <div className="resident-dashboard">

      {/* ================= HERO ================= */}

      <section className="resident-hero">
        <div>
          <p className="resident-greeting">
            สวัสดี
            {tenant?.fullName
              ? `คุณ ${tenant.fullName}`
              : 'คุณผู้พักอาศัย'}
          </p>

          <h1>
            จัดการเรื่องห้องพักได้ในที่เดียว
          </h1>

          <p className="resident-room">
            {roomName}
          </p>
        </div>

        <div className="resident-bill-summary">
          <span>
            ยอดที่ต้องชำระเดือนนี้
          </span>

          <strong>
            ฿{amount.toLocaleString()}
          </strong>

          <small>
            {dueDate
              ? `ครบกำหนด ${formatDate(dueDate)}`
              : 'ตรวจสอบรายละเอียดบิลล่าสุด'}
          </small>

          <button
            type="button"
            onClick={() => navigate('/user/payment')}
          >
            ชำระเงินตอนนี้
          </button>
        </div>
      </section>

      {/* ================= QUICK MENU ================= */}

      <section
        className="resident-quick-grid"
        aria-label="ทำรายการด่วน"
      >
        <button
          type="button"
          onClick={() => navigate('/user/payment')}
        >
          <span className="quick-icon">
            <Wallet
              aria-hidden="true"
              size={20}
              strokeWidth={2}
            />
          </span>

          <b>ชำระค่าเช่า</b>
          <small>ดูบิลและส่งหลักฐาน</small>
        </button>

        <button
          type="button"
          onClick={() => navigate('/user/repair')}
        >
          <span className="quick-icon">
            <Wrench
              aria-hidden="true"
              size={20}
              strokeWidth={2}
            />
          </span>

          <b>แจ้งซ่อม</b>
          <small>แจ้งปัญหาภายในห้อง</small>
        </button>

        <button
          type="button"
          onClick={() => navigate('/user/complaint')}
        >
          <span className="quick-icon">
            <MessageCircle
              aria-hidden="true"
              size={20}
              strokeWidth={2}
            />
          </span>

          <b>ติดต่อผู้ดูแล</b>
          <small>สอบถามหรือแจ้งเรื่อง</small>
        </button>

        <button
          type="button"
          onClick={() => navigate('/user/parcel')}
        >
          <span className="quick-icon">
            <Package
              aria-hidden="true"
              size={20}
              strokeWidth={2}
            />
          </span>

          <b>พัสดุของฉัน</b>
          <small>ตรวจสอบพัสดุที่มาถึง</small>
        </button>
      </section>

      {/* ================= DASHBOARD COLUMNS ================= */}

      <section className="resident-dashboard-columns">

        {/* ================= LEFT ================= */}

        <div className="resident-panel">

          {/* บิลล่าสุด */}

          <div className="resident-panel-head">
            <h2>บิลล่าสุด</h2>

            <button
              type="button"
              onClick={() => navigate('/user/payment')}
            >
              ดูทั้งหมด
            </button>
          </div>

          {payments.length ? (
            payments.slice(0, 3).map((payment) => {
              const status = paymentStatus(
                payment.status
              );

              return (
                <div
                  className="resident-bill-row"
                  key={payment.id}
                >
                  <div>
                    <b>
                      {payment.month ||
                        formatDate(
                          payment.created_at ||
                          payment.createdAt
                        )}
                    </b>

                    <small>
                      ค่าเช่าและค่าสาธารณูปโภค
                    </small>
                  </div>

                  <div>
                    <strong>
                      ฿
                      {Number(
                        payment.amount || 0
                      ).toLocaleString()}
                    </strong>

                    <span
                      className={`resident-status ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="resident-empty">
              ยังไม่มีรายการบิล
            </div>
          )}

          {/* ================= แจ้งซ่อม ================= */}

          <div className="resident-subsection">

            <div className="resident-panel-head">

              <div>
                <h2>สถานะแจ้งซ่อม</h2>

                <small>
                  {activeRepairs.length
                    ? `มี ${activeRepairs.length} รายการที่กำลังติดตาม`
                    : 'ไม่มีรายการค้าง'}
                </small>
              </div>

              <button
                type="button"
                onClick={() => navigate('/user/repair')}
              >
                ดูทั้งหมด
              </button>

            </div>

            {latestRepair ? (

              <div className="resident-repair-row">

                <span className="resident-repair-icon">
                  <Wrench
                    size={18}
                    strokeWidth={2}
                  />
                </span>

                <div>
                  <b>
                    {latestRepair.category ||
                      `แจ้งซ่อม #${latestRepair.id}`}
                  </b>

                  <small>
                    {latestRepair.description}
                  </small>

                  <small>
                    แจ้งเมื่อ{' '}
                    {formatDate(
                      latestRepair.created_at ||
                      latestRepair.createdAt
                    )}
                  </small>
                </div>

                <span
                  className={`resident-status ${latestRepairStatus.className}`}
                >
                  {latestRepairStatus.label}
                </span>

              </div>

            ) : (

              <div className="resident-empty">
                ยังไม่มีรายการแจ้งซ่อม
              </div>

            )}

          </div>
        </div>

        {/* ================= RIGHT ================= */}

        <div className="resident-panel">

          <div className="resident-panel-head">
            <h2>ประกาศจากหอพัก</h2>

            <button
              type="button"
              onClick={() =>
                navigate('/user/announcement')
              }
            >
              ดูทั้งหมด
            </button>
          </div>

          {announcements.length ? (

            announcements.slice(0, 3).map((item) => (

              <article
                className="resident-notice-row"
                key={item.id}
              >
                <i />

                <div>
                  <b>{item.title}</b>

                  <small>
                    {formatDate(item.created_at)}
                  </small>
                </div>
              </article>

            ))

          ) : (

            <div className="resident-empty">
              ยังไม่มีประกาศในขณะนี้
            </div>

          )}

        </div>

      </section>
    </div>
  );
}

