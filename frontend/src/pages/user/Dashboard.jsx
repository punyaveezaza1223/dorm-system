import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  // =================================
  // รับข้อมูลจาก User.jsx
  // =================================

  const { tenant, room } = useOutletContext();

  // =================================
  // State
  // =================================

  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);

  // =================================
  // ดึงข้อมูล Dashboard
  // =================================

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          navigate('/');
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // =================================
        // ดึงข้อมูลการชำระเงิน
        // =================================

        const paymentResponse = await fetch(
          'http://localhost:4000/api/tenant/payments',
          {
            method: 'GET',
            headers,
          }
        );

        const paymentResult =
          await paymentResponse.json();

        // =================================
        // ดึงข้อมูลแจ้งซ่อม / ร้องเรียน
        // =================================

        const complaintResponse = await fetch(
          'http://localhost:4000/api/tenant/complaints',
          {
            method: 'GET',
            headers,
          }
        );

        const complaintResult =
          await complaintResponse.json();

        // =================================
        // ตรวจสอบ Token
        // =================================

        if (
          paymentResponse.status === 401 ||
          paymentResponse.status === 403 ||
          complaintResponse.status === 401 ||
          complaintResponse.status === 403
        ) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          navigate('/');
          return;
        }

        // =================================
        // เก็บข้อมูล
        // =================================

        if (paymentResult.success) {
          setPayments(paymentResult.data || []);
        }

        if (complaintResult.success) {
          setComplaints(complaintResult.data || []);
        }

      } catch (error) {
        console.error(
          'Dashboard Error:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  // =================================
  // Loading
  // =================================

  if (loading) {
    return (
      <div className="page">
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
          }}
        >
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  // =================================
  // Payment Data
  // =================================

  const latestPayment =
    payments.length > 0
      ? payments[0]
      : null;

  // =================================
  // ค่าเช่าล่าสุด
  // =================================

  const rentAmount = latestPayment
    ? Number(latestPayment.amount || 0)
    : Number(room?.contract_rent || room?.room_rent || 0);

  // =================================
  // Payment Status
  // =================================

  let paymentStatusText = 'ยังไม่มีรายการ';

  let paymentStatusClass = '';

  if (latestPayment) {
    if (latestPayment.status === 'paid') {
      paymentStatusText = 'ชำระแล้ว';
      paymentStatusClass = 'b-green';
    } else if (
      latestPayment.status === 'pending'
    ) {
      paymentStatusText = 'รอตรวจสอบ';
      paymentStatusClass = 'b-amber';
    } else if (
      latestPayment.status === 'overdue'
    ) {
      paymentStatusText = 'ค้างชำระ';
      paymentStatusClass = 'b-red';
    }
  }

  // =================================
  // จำนวนแจ้งซ่อมที่ยังไม่เสร็จ
  // =================================

  const activeComplaints =
    complaints.filter(
      (item) =>
        item.status === 'open' ||
        item.status === 'in_progress'
    );

  // =================================
  // รายการแจ้งซ่อมล่าสุด
  // =================================

  const latestComplaint =
    complaints.length > 0
      ? complaints[0]
      : null;

  // =================================
  // แปลง Status แจ้งซ่อม
  // =================================

  const getComplaintStatus = (status) => {
    switch (status) {
      case 'open':
        return {
          text: 'แจ้งซ่อม',
          className: 'b-amber',
        };

      case 'in_progress':
        return {
          text: 'กำลังดำเนินการ',
          className: 'b-amber',
        };

      case 'resolved':
        return {
          text: 'เสร็จสิ้น',
          className: 'b-green',
        };

      default:
        return {
          text: status || 'ไม่ทราบสถานะ',
          className: '',
        };
    }
  };

  // =================================
  // วันที่
  // =================================

  const formatDate = (date) => {
    if (!date) {
      return '—';
    }

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // =================================
  // Complaint Status
  // =================================

  const latestComplaintStatus =
    latestComplaint
      ? getComplaintStatus(
          latestComplaint.status
        )
      : null;

  // =================================
  // Render
  // =================================

  return (
    <div
      className="page"
      data-p="res-dashboard"
    >

      {/* ================================= */}
      {/* Header */}
      {/* ================================= */}

      <div className="page-head">

        <div className="eyebrow">
          สวัสดี, {tenant?.fullName || 'ลูกบ้าน'}
        </div>

        <h2>
          ภาพรวมห้องพักของคุณ
        </h2>

        <p>
          ติดตามสถานะการแจ้งซ่อม
          การชำระเงิน และข่าวสารล่าสุด
          จากผู้ดูแลได้ในหน้าเดียว
        </p>

      </div>

      {/* ================================= */}
      {/* Statistics */}
      {/* ================================= */}

      <div
        className="grid-4"
        style={{
          marginBottom: '22px',
        }}
      >

        {/* ค่าเช่า */}

        <div className="card stat">

          <div className="label">
            ค่าเช่าล่าสุด
          </div>

          <div className="value">
            ฿{rentAmount.toLocaleString()}
          </div>

          <div
            className={`sub badge ${paymentStatusClass}`}
          >
            {latestPayment
              ? paymentStatusText
              : 'ยังไม่มีรายการ'}
          </div>

        </div>

        {/* แจ้งซ่อม */}

        <div className="card stat">

          <div className="label">
            แจ้งซ่อมที่เปิดอยู่
          </div>

          <div className="value">
            {activeComplaints.length}
          </div>

          <div className="sub">
            {activeComplaints.length > 0
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
            ระบบพัสดุยังไม่เชื่อมต่อ
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
            ยังไม่มี API ค่าน้ำ-ไฟ
          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* Two Columns */}
      {/* ================================= */}

      <div className="two-col">

        {/* ================================= */}
        {/* Latest Repair */}
        {/* ================================= */}

        <div className="card card-pad">

          <div
            className="row between"
            style={{
              marginBottom: '14px',
            }}
          >

            <h3
              style={{
                fontSize: '15.5px',
              }}
            >
              สถานะงานแจ้งซ่อมล่าสุด
            </h3>

            {latestComplaintStatus && (
              <span
                className={`badge ${latestComplaintStatus.className}`}
              >
                {latestComplaintStatus.text}
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

                {' · แจ้งเมื่อ '}

                {formatDate(
                  latestComplaint.created_at
                )}

              </p>

              {/* ================================= */}
              {/* Steps */}
              {/* ================================= */}

              <div className="steps">

                <div
                  className={`step ${
                    latestComplaint.status === 'open' ||
                    latestComplaint.status === 'in_progress' ||
                    latestComplaint.status === 'resolved'
                      ? 'done'
                      : ''
                  }`}
                >
                  <div className="circ">
                    {latestComplaint.status !== 'open'
                      ? '✓'
                      : '1'}
                  </div>

                  <div className="lbl">
                    แจ้งซ่อม
                  </div>
                </div>

                <div
                  className={`step ${
                    latestComplaint.status ===
                      'in_progress' ||
                    latestComplaint.status ===
                      'resolved'
                      ? 'done'
                      : ''
                  }`}
                >
                  <div className="circ">
                    {latestComplaint.status ===
                      'in_progress' ||
                    latestComplaint.status ===
                      'resolved'
                      ? '✓'
                      : '2'}
                  </div>

                  <div className="lbl">
                    รับเรื่อง
                  </div>
                </div>

                <div
                  className={`step ${
                    latestComplaint.status ===
                    'in_progress'
                      ? 'now'
                      : latestComplaint.status ===
                        'resolved'
                      ? 'done'
                      : ''
                  }`}
                >
                  <div className="circ">
                    {latestComplaint.status ===
                    'resolved'
                      ? '✓'
                      : '3'}
                  </div>

                  <div className="lbl">
                    กำลังซ่อม
                  </div>
                </div>

                <div
                  className={`step ${
                    latestComplaint.status ===
                    'resolved'
                      ? 'done'
                      : ''
                  }`}
                >
                  <div className="circ">
                    {latestComplaint.status ===
                    'resolved'
                      ? '✓'
                      : '4'}
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
            style={{
              marginTop: '10px',
            }}
            onClick={() =>
              navigate('/user/repair')
            }
          >
            ดูรายละเอียดทั้งหมด
          </button>

        </div>

        {/* ================================= */}
        {/* Announcement */}
        {/* ================================= */}

        <div className="card card-pad">

          <h3
            style={{
              fontSize: '15.5px',
              marginBottom: '14px',
            }}
          >
            ประกาศล่าสุด
          </h3>

          <div
            className="announce-item"
            style={{
              paddingTop: 0,
            }}
          >

            <div className="tag-lbl">
              ประกาศทั่วไป
            </div>

            <h4>
              ยังไม่มีประกาศ
            </h4>

            <p>
              ระบบประกาศยังไม่ได้เชื่อมต่อ
              กับ Backend
            </p>

            <div className="date">
              —
            </div>

          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigate('/user/announcement')
            }
          >
            ดูประกาศทั้งหมด
          </button>

        </div>

      </div>

    </div>
  );
}