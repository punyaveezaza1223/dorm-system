import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // =================================
  // โหลดข้อมูลลูกบ้าน
  // =================================

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');

        if (!token) {
          navigate('/');
          return;
        }

        // ================================
        // ข้อมูลลูกบ้าน + ห้อง
        // ================================

        const meResponse = await fetch(
          'http://localhost:4000/api/tenant/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const meResult = await meResponse.json();

        if (!meResponse.ok || !meResult.success) {
          throw new Error(
            meResult.message || 'ไม่สามารถโหลดข้อมูลลูกบ้านได้'
          );
        }

        setUser(meResult.user);
        setRoom(meResult.room);

        // ================================
        // ข้อมูลการชำระเงิน
        // ================================

        const paymentResponse = await fetch(
          'http://localhost:4000/api/tenant/payments',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const paymentResult = await paymentResponse.json();

        if (paymentResponse.ok && paymentResult.success) {
          setPayments(paymentResult.data || []);
        }

        // ================================
        // ข้อมูลแจ้งซ่อม
        // ================================

        const complaintResponse = await fetch(
          'http://localhost:4000/api/tenant/complaints',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const complaintResult = await complaintResponse.json();

        if (complaintResponse.ok && complaintResult.success) {
          setComplaints(complaintResult.data || []);
        }

      } catch (err) {
        console.error('Dashboard Error:', err);

        if (
          err.message?.includes('401') ||
          err.message?.includes('token')
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/');
          return;
        }

        setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');

      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  // =================================
  // Loading
  // =================================

  if (loading) {
    return (
      <div className="page" data-p="res-dashboard">
        <div className="page-head">
          <div className="eyebrow">กำลังโหลดข้อมูล...</div>
          <h2>ภาพรวมห้องพักของคุณ</h2>
        </div>
      </div>
    );
  }

  // =================================
  // Error
  // =================================

  if (error) {
    return (
      <div className="page" data-p="res-dashboard">
        <div className="page-head">
          <div className="eyebrow">เกิดข้อผิดพลาด</div>
          <h2>ไม่สามารถโหลดข้อมูลได้</h2>

          <p>{error}</p>

          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  // =================================
  // คำนวณข้อมูล
  // =================================

  const latestPayment = payments.length > 0
    ? payments[0]
    : null;

  const openComplaints = complaints.filter(
    (item) =>
      item.status === 'open' ||
      item.status === 'in_progress'
  );

  const latestComplaint = complaints.length > 0
    ? complaints[0]
    : null;

  // =================================
  // แปลงสถานะแจ้งซ่อม
  // =================================

  const getComplaintStatus = (status) => {
    if (status === 'open') {
      return 'รอรับเรื่อง';
    }

    if (status === 'in_progress') {
      return 'กำลังดำเนินการ';
    }

    if (status === 'resolved') {
      return 'เสร็จสิ้น';
    }

    return status || 'ไม่ทราบสถานะ';
  };

  // =================================
  // แปลงวันที่
  // =================================

  const formatDate = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // =================================
  // แปลงจำนวนเงิน
  // =================================

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString('th-TH');
  };

  return (
    <div className="page" data-p="res-dashboard">

      {/* ================================= */}
      {/* Header */}
      {/* ================================= */}

      <div className="page-head">

        <div className="eyebrow">
          สวัสดี, {user?.fullName || 'ลูกบ้าน'}
        </div>

        <h2>
          ภาพรวมห้องพักของคุณ
        </h2>

        <p>
          ติดตามสถานะการแจ้งซ่อม การชำระเงิน
          และข่าวสารล่าสุดจากผู้ดูแลได้ในหน้าเดียว
        </p>

      </div>


      {/* ================================= */}
      {/* Room Information */}
      {/* ================================= */}

      <div
        className="card card-pad"
        style={{ marginBottom: '22px' }}
      >

        <div className="row between">

          <div>
            <div className="label">
              ห้องพักของคุณ
            </div>

            <h3 style={{ marginTop: '5px' }}>
              {room?.room_number || 'ยังไม่มีห้อง'}
            </h3>
          </div>

          <div>
            <span className="badge b-green">
              {room?.room_status === 'occupied'
                ? 'มีผู้พัก'
                : '—'}
            </span>
          </div>

        </div>

        {room && (
          <div
            style={{
              marginTop: '12px',
              fontSize: '13px',
              color: 'var(--text-dim)',
            }}
          >
            ชั้น {room.floor} · {room.type} · {room.size_sqm} ตร.ม.
          </div>
        )}

      </div>


      {/* ================================= */}
      {/* Statistics */}
      {/* ================================= */}

      <div
        className="grid-4"
        style={{ marginBottom: '22px' }}
      >

        {/* ค่าเช่า */}

        <div className="card stat">

          <div className="label">
            ค่าเช่าเดือนนี้
          </div>

          <div className="value">
            ฿
            {formatMoney(
              latestPayment?.amount ||
              room?.contract_rent ||
              room?.room_rent
            )}
          </div>

          <div className="sub">

            {latestPayment
              ? latestPayment.status === 'paid'
                ? 'ชำระแล้ว'
                : latestPayment.status === 'overdue'
                  ? 'ค้างชำระ'
                  : 'รอชำระ'
              : 'ยังไม่มีข้อมูลการชำระ'}

          </div>

        </div>


        {/* แจ้งซ่อม */}

        <div className="card stat">

          <div className="label">
            แจ้งซ่อมที่เปิดอยู่
          </div>

          <div className="value">
            {openComplaints.length}
          </div>

          <div className="sub">
            {openComplaints.length > 0
              ? 'กำลังดำเนินการ'
              : 'ไม่มีรายการค้าง'}
          </div>

        </div>


        {/* พัสดุ */}

        <div className="card stat">

          <div className="label">
            พัสดุรอรับ
          </div>

          <div className="value">
            —
          </div>

          <div className="sub">
            ระบบพัสดุยังไม่ได้เชื่อมต่อ
          </div>

        </div>


        {/* ค่าน้ำไฟ */}

        <div className="card stat">

          <div className="label">
            ค่าน้ำ-ไฟเดือนนี้
          </div>

          <div className="value">
            —
          </div>

          <div className="sub">
            ระบบค่าน้ำไฟยังไม่ได้เชื่อมต่อ
          </div>

        </div>

      </div>


      {/* ================================= */}
      {/* Two Column */}
      {/* ================================= */}

      <div className="two-col">


        {/* ================================= */}
        {/* Repair */}
        {/* ================================= */}

        <div className="card card-pad">

          <div
            className="row between"
            style={{ marginBottom: '14px' }}
          >

            <h3 style={{ fontSize: '15.5px' }}>
              สถานะงานแจ้งซ่อมล่าสุด
            </h3>

            {latestComplaint && (
              <span className="badge b-amber">
                {getComplaintStatus(
                  latestComplaint.status
                )}
              </span>
            )}

          </div>


          {latestComplaint ? (

            <>

              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-dim)',
                  margin: '0 0 16px',
                }}
              >

                #{latestComplaint.id}
                {' · '}
                {latestComplaint.title}
                {' · '}
                แจ้งเมื่อ{' '}
                {formatDate(
                  latestComplaint.created_at
                )}

              </p>


              <div className="steps">

                <div
                  className={
                    latestComplaint.status === 'open' ||
                    latestComplaint.status === 'in_progress' ||
                    latestComplaint.status === 'resolved'
                      ? 'step done'
                      : 'step'
                  }
                >
                  <div className="circ">
                    ✓
                  </div>

                  <div className="lbl">
                    แจ้งซ่อม
                  </div>
                </div>


                <div
                  className={
                    latestComplaint.status === 'in_progress' ||
                    latestComplaint.status === 'resolved'
                      ? 'step done'
                      : 'step'
                  }
                >
                  <div className="circ">
                    {latestComplaint.status === 'open'
                      ? '2'
                      : '✓'}
                  </div>

                  <div className="lbl">
                    รับเรื่อง
                  </div>
                </div>


                <div
                  className={
                    latestComplaint.status === 'in_progress'
                      ? 'step now'
                      : latestComplaint.status === 'resolved'
                        ? 'step done'
                        : 'step'
                  }
                >
                  <div className="circ">
                    {latestComplaint.status === 'resolved'
                      ? '✓'
                      : '3'}
                  </div>

                  <div className="lbl">
                    กำลังซ่อม
                  </div>
                </div>


                <div
                  className={
                    latestComplaint.status === 'resolved'
                      ? 'step done'
                      : 'step'
                  }
                >
                  <div className="circ">
                    4
                  </div>

                  <div className="lbl">
                    เสร็จสิ้น
                  </div>
                </div>

              </div>

            </>

          ) : (

            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-dim)',
              }}
            >
              ยังไม่มีรายการแจ้งซ่อม
            </p>

          )}


          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: '10px' }}
            onClick={() =>
              navigate('/user/repair')
            }
          >
            ดูรายละเอียดทั้งหมด
          </button>

        </div>


        {/* ================================= */}
        {/* Payment */}
        {/* ================================= */}

        <div className="card card-pad">

          <h3
            style={{
              fontSize: '15.5px',
              marginBottom: '14px',
            }}
          >
            ข้อมูลการชำระเงินล่าสุด
          </h3>


          {latestPayment ? (

            <div
              className="announce-item"
              style={{ paddingTop: 0 }}
            >

              <div className="tag-lbl">
                ค่าเช่า
              </div>

              <h4>
                ฿
                {formatMoney(
                  latestPayment.amount
                )}
              </h4>

              <p>
                ครบกำหนดชำระ{' '}
                {formatDate(
                  latestPayment.due_date
                )}
              </p>

              <div className="date">

                สถานะ:{' '}

                {latestPayment.status === 'paid'
                  ? 'ชำระแล้ว'
                  : latestPayment.status === 'overdue'
                    ? 'ค้างชำระ'
                    : 'รอชำระ'}

              </div>

            </div>

          ) : (

            <div
              className="announce-item"
              style={{ paddingTop: 0 }}
            >

              <div className="tag-lbl">
                ค่าเช่า
              </div>

              <h4>
                ยังไม่มีข้อมูล
              </h4>

              <p>
                ยังไม่มีรายการชำระเงินของคุณ
              </p>

            </div>

          )}


          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigate('/user/payment')
            }
          >
            ดูข้อมูลการชำระเงิน
          </button>

        </div>

      </div>

    </div>
  );
}