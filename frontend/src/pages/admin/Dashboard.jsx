import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [roomData, setRoomData] = useState([]);

  const [summary, setSummary] = useState({
    totalRooms: 0,
    availableRooms: 0,
    maintenanceRooms: 0,
    overduePayments: 0,
  });

  const [selectedRoom, setSelectedRoom] = useState(null);

  // เลือกชั้น
  const [selectedFloor, setSelectedFloor] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // =================================
  // ดึงข้อมูลจาก Backend
  // =================================

  useEffect(() => {
    fetch('http://localhost:4000/api/dashboard')
      .then((res) => {
        if (!res.ok) {
          throw new Error('ไม่สามารถเชื่อมต่อ Backend ได้');
        }

        return res.json();
      })
      .then((data) => {
        if (!data.success) {
          throw new Error(data.message || 'เกิดข้อผิดพลาด');
        }

        setRoomData(data.rooms || []);

        setSummary(
          data.summary || {
            totalRooms: 0,
            availableRooms: 0,
            maintenanceRooms: 0,
            overduePayments: 0,
          }
        );
      })
      .catch((err) => {
        console.error('Dashboard API Error:', err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // =================================
  // เปิด Modal
  // =================================

  const openRoomModal = (room) => {
    setSelectedRoom(room);
  };

  // =================================
  // ปิด Modal
  // =================================

  const closeModal = () => {
    setSelectedRoom(null);
  };

  // =================================
  // สี Badge
  // =================================

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ว่าง':
        return 'b-green';

      case 'แจ้งซ่อม':
        return 'b-rust';

      case 'ค้างชำระ':
        return 'b-red';

      default:
        return 'b-amber';
    }
  };

  // =================================
  // สีของป้ายห้อง
  // =================================

  const getRoomClass = (status) => {
    switch (status) {
      case 'ว่าง':
        return 'st-empty';

      case 'แจ้งซ่อม':
        return 'st-fix';

      case 'ค้างชำระ':
        return 'st-due';

      case 'มีผู้พัก':
        return 'st-occ';

      default:
        return 'st-occ';
    }
  };

  // =================================
  // กรองห้องตามชั้น
  // =================================

  const filteredRooms =
    selectedFloor === 'all'
      ? roomData
      : roomData.filter(
          (room) =>
            Number(room.floor) === Number(selectedFloor)
        );

  // =================================
  // Loading
  // =================================

  if (loading) {
    return (
      <div className="page" data-p="ad-dashboard">
        <div className="page-head">
          <div className="eyebrow">ภาพรวมระบบ</div>

          <h2>
            สถานะห้องพักและรายละเอียดผู้พักอาศัย
          </h2>

          <p>
            กำลังโหลดข้อมูลจากฐานข้อมูล...
          </p>
        </div>
      </div>
    );
  }

  // =================================
  // Error
  // =================================

  if (error) {
    return (
      <div className="page" data-p="ad-dashboard">
        <div className="page-head">

          <div className="eyebrow">
            ภาพรวมระบบ
          </div>

          <h2>
            สถานะห้องพักและรายละเอียดผู้พักอาศัย
          </h2>

          <div className="card card-pad">

            <p style={{ color: 'var(--red)' }}>
              ไม่สามารถโหลดข้อมูล Dashboard ได้
            </p>

            <p>{error}</p>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => window.location.reload()}
            >
              ลองใหม่
            </button>

          </div>
        </div>
      </div>
    );
  }

  // =================================
  // Dashboard
  // =================================

  return (
    <div className="page" data-p="ad-dashboard">

      {/* ==============================
          Header
      ============================== */}

      <div className="page-head">

        <div className="eyebrow">
          ภาพรวมระบบ
        </div>

        <h2>
          สถานะห้องพักและรายละเอียดผู้พักอาศัย
        </h2>

        <p>
          คลิกที่ป้ายห้องเพื่อดูรายละเอียดผู้พักอาศัยและสถานะล่าสุดของแต่ละห้อง
        </p>

      </div>


      {/* ==============================
          Summary
      ============================== */}

      <div
        className="grid-4"
        style={{ marginBottom: '22px' }}
      >

        {/* ห้องทั้งหมด */}

        <div className="card stat">

          <div className="label">
            ห้องทั้งหมด
          </div>

          <div className="value">
            {summary.totalRooms}
          </div>

          <div className="sub">
            ห้องในระบบ
          </div>

        </div>


        {/* ห้องว่าง */}

        <div className="card stat">

          <div className="label">
            ห้องว่าง
          </div>

          <div className="value">
            {summary.availableRooms}
          </div>

          <div className="sub badge b-green">
            พร้อมปล่อยเช่า
          </div>

        </div>


        {/* แจ้งซ่อม */}

        <div className="card stat">

          <div className="label">
            แจ้งซ่อมค้าง
          </div>

          <div className="value">
            {summary.maintenanceRooms}
          </div>

          <div className="sub badge b-amber">
            รอดำเนินการ
          </div>

        </div>


        {/* ค้างชำระ */}

        <div className="card stat">

          <div className="label">
            ค้างชำระ
          </div>

          <div className="value">
            {summary.overduePayments}
          </div>

          <div className="sub badge b-red">
            เกินกำหนด
          </div>

        </div>

      </div>


      {/* ==============================
          ผังห้องพัก
      ============================== */}

      <div className="card card-pad">

        <div
          className="row between"
          style={{ marginBottom: '16px' }}
        >

          <h3 style={{ fontSize: '15.5px' }}>
            ผังห้องพัก
          </h3>


          {/* ==========================
              ตัวเลือกชั้น
          ========================== */}

          <select
            value={selectedFloor}
            onChange={(e) => {
              setSelectedFloor(e.target.value);
            }}
            style={{
              border: '1.5px solid var(--line)',
              borderRadius: '9px',
              padding: '7px 10px',
              fontSize: '13px',
            }}
          >

            <option value="all">
              ห้องทั้งหมด
            </option>

            <option value="1">
              ชั้น 1
            </option>

            <option value="2">
              ชั้น 2
            </option>

            <option value="3">
              ชั้น 3
            </option>

          </select>

        </div>


        {/* ==============================
            ห้องพัก
        ============================== */}

        <div
          className="pegboard"
          id="pegboard"
        >

          {filteredRooms.map((room) => (

            <div
              key={room.id}
              className={`tag ${getRoomClass(room.status)}`}
              onClick={() => openRoomModal(room)}
            >

              <div className="rnum">
                {room.roomNumber}
              </div>

              <span className="rstat">
                {room.status}
              </span>

            </div>

          ))}

        </div>


        {/* ==============================
            Legend
        ============================== */}

        <div className="legend">

          <div className="item">

            <span
              className="sw"
              style={{
                background: 'var(--sage)',
              }}
            ></span>

            ห้องว่าง

          </div>


          <div className="item">

            <span
              className="sw"
              style={{
                background: 'var(--brass)',
              }}
            ></span>

            มีผู้พักอาศัย

          </div>


          <div className="item">

            <span
              className="sw"
              style={{
                background: 'var(--rust)',
              }}
            ></span>

            อยู่ระหว่างแจ้งซ่อม

          </div>


          <div className="item">

            <span
              className="sw"
              style={{
                background: 'var(--red)',
              }}
            ></span>

            ค้างชำระค่าเช่า

          </div>

        </div>

      </div>


      {/* ==============================
          Modal
      ============================== */}

      {selectedRoom && (

        <div
          className="modal-overlay active"
          onClick={closeModal}
        >

          <div
            className="modal"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >

            <h3>
              ห้อง {selectedRoom.roomNumber}
            </h3>


            <div
              className="col gap-12"
              style={{
                fontSize: '13.8px',
              }}
            >

              {/* สถานะ */}

              <div className="row between">

                <span
                  style={{
                    color: 'var(--text-dim)',
                  }}
                >
                  สถานะ
                </span>

                <span
                  className={`badge ${getStatusBadgeClass(
                    selectedRoom.status
                  )}`}
                >
                  {selectedRoom.status}
                </span>

              </div>


              {/* ผู้พัก */}

              <div className="row between">

                <span
                  style={{
                    color: 'var(--text-dim)',
                  }}
                >
                  ผู้พักอาศัย
                </span>

                <b>
                  {selectedRoom.tenant}
                </b>

              </div>


              {/* เบอร์โทร */}

              <div className="row between">

                <span
                  style={{
                    color: 'var(--text-dim)',
                  }}
                >
                  เบอร์ติดต่อ
                </span>

                <span className="mono">
                  {selectedRoom.phone}
                </span>

              </div>


              {/* ค่าเช่า */}

              <div className="row between">

                <span
                  style={{
                    color: 'var(--text-dim)',
                  }}
                >
                  ค่าเช่า/เดือน
                </span>

                <span className="mono">
                  ฿
                  {Number(
                    selectedRoom.rent || 0
                  ).toLocaleString()}
                </span>

              </div>


              {/* สถานะชำระเงิน */}

              <div className="row between">

                <span
                  style={{
                    color: 'var(--text-dim)',
                  }}
                >
                  สถานะชำระเงิน
                </span>

                <span
                  className={`badge ${
                    selectedRoom.payStatus ===
                    'ชำระแล้ว'
                      ? 'b-green'
                      : selectedRoom.payStatus ===
                        'ค้างชำระ'
                        ? 'b-red'
                        : 'b-amber'
                  }`}
                >
                  {selectedRoom.payStatus}
                </span>

              </div>

            </div>


            {/* ==========================
                Modal Footer
            ========================== */}

            <div className="modal-foot">

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeModal}
              >
                ปิด
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
              >
                ดูประวัติทั้งหมด
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}