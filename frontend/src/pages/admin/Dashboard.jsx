import React, { useState } from 'react';

export default function Dashboard() {
  const [selectedRoom, setSelectedRoom] = useState(null);

  const roomData = {
    A01: { status: 'ว่าง', tenant: '—', phone: '—', rent: '฿5,500', payStatus: '—' },
    A02: { status: 'มีผู้พัก', tenant: 'นางสาวณัฐชา วงศ์ทอง', phone: '081-234-5678', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
    A03: { status: 'มีผู้พัก', tenant: 'นายวิชัย สุขใจ', phone: '082-345-6789', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
    A04: { status: 'แจ้งซ่อม', tenant: 'นายกิตติ จันทร์เพ็ญ', phone: '086-111-2222', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
    A05: { status: 'มีผู้พัก', tenant: 'นางสาวสมหญิง มีสุข', phone: '083-456-7890', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
    A06: { status: 'ค้างชำระ', tenant: 'นายสมชาย ใจดี', phone: '089-765-4321', rent: '฿9,000', payStatus: 'ค้างชำระ' },
    A07: { status: 'ว่าง', tenant: '—', phone: '—', rent: '฿5,500', payStatus: '—' },
    A08: { status: 'มีผู้พัก', tenant: 'นายอนันต์ รุ่งเรือง', phone: '084-567-8901', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
    A09: { status: 'มีผู้พัก', tenant: 'นายวีระ พงษ์ไพร', phone: '085-678-9012', rent: '฿6,500', payStatus: 'รอตรวจสอบ' },
    A10: { status: 'ค้างชำระ', tenant: 'นางสาวนภา รักดี', phone: '087-890-1234', rent: '฿6,500', payStatus: 'ค้างชำระ' },
    A11: { status: 'มีผู้พัก', tenant: 'นายปิติ มั่นคง', phone: '088-901-2345', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
    A12: { status: 'มีผู้พัก', tenant: 'นางสาวณัฐชา วงศ์ทอง', phone: '081-234-5678', rent: '฿6,500', payStatus: 'ชำระแล้ว' },
  };

  const openRoomModal = (num) => {
    setSelectedRoom({
      num,
      ...roomData[num],
    });
  };

  const closeModal = () => {
    setSelectedRoom(null);
  };

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

  return (
    <div className="page" data-p="ad-dashboard">
      <div className="page-head">
        <div className="eyebrow">ภาพรวมระบบ</div>
        <h2>สถานะห้องพักและรายละเอียดผู้พักอาศัย</h2>
        <p>คลิกที่ป้ายห้องเพื่อดูรายละเอียดผู้พักอาศัยและสถานะล่าสุดของแต่ละห้อง</p>
      </div>
      <div className="grid-4" style={{ marginBottom: '22px' }}>
        <div className="card stat">
          <div className="label">ห้องทั้งหมด</div>
          <div className="value">48</div>
          <div className="sub">4 ชั้น × 12 ห้อง</div>
        </div>
        <div className="card stat">
          <div className="label">ห้องว่าง</div>
          <div className="value">6</div>
          <div className="sub badge b-green">พร้อมปล่อยเช่า</div>
        </div>
        <div className="card stat">
          <div className="label">แจ้งซ่อมค้าง</div>
          <div className="value">7</div>
          <div className="sub badge b-amber">รอดำเนินการ</div>
        </div>
        <div className="card stat">
          <div className="label">ค้างชำระ</div>
          <div className="value">3</div>
          <div className="sub badge b-red">เกินกำหนด</div>
        </div>
      </div>
      <div className="card card-pad">
        <div className="row between" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15.5px' }}>ผังห้องพัก — ตึก A ชั้น 1</h3>
          <select style={{ border: '1.5px solid var(--line)', borderRadius: '9px', padding: '7px 10px', fontSize: '13px' }}>
            <option>ตึก A ชั้น 1</option>
            <option>ตึก A ชั้น 2</option>
            <option>ตึก B ชั้น 1</option>
          </select>
        </div>
        <div className="pegboard" id="pegboard">
          <div className="tag st-empty" onClick={() => openRoomModal('A01')}><div className="rnum">A01</div><span className="rstat">ว่าง</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A02')}><div className="rnum">A02</div><span className="rstat">มีผู้พัก</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A03')}><div className="rnum">A03</div><span className="rstat">มีผู้พัก</span></div>
          <div className="tag st-fix" onClick={() => openRoomModal('A04')}><div className="rnum">A04</div><span className="rstat">แจ้งซ่อม</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A05')}><div className="rnum">A05</div><span className="rstat">มีผู้พัก</span></div>
          <div className="tag st-due" onClick={() => openRoomModal('A06')}><div className="rnum">A06</div><span className="rstat">ค้างชำระ</span></div>
          <div className="tag st-empty" onClick={() => openRoomModal('A07')}><div className="rnum">A07</div><span className="rstat">ว่าง</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A08')}><div className="rnum">A08</div><span className="rstat">มีผู้พัก</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A09')}><div className="rnum">A09</div><span className="rstat">มีผู้พัก</span></div>
          <div className="tag st-due" onClick={() => openRoomModal('A10')}><div className="rnum">A10</div><span className="rstat">ค้างชำระ</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A11')}><div className="rnum">A11</div><span className="rstat">มีผู้พัก</span></div>
          <div className="tag st-occ" onClick={() => openRoomModal('A12')}><div className="rnum">A12</div><span className="rstat">มีผู้พัก</span></div>
        </div>
        <div className="legend">
          <div className="item"><span className="sw" style={{ background: 'var(--sage)' }}></span>ห้องว่าง</div>
          <div className="item"><span class="sw" style={{ background: 'var(--brass)' }}></span>มีผู้พักอาศัย</div>
          <div className="item"><span className="sw" style={{ background: 'var(--rust)' }}></span>อยู่ระหว่างแจ้งซ่อม</div>
          <div className="item"><span className="sw" style={{ background: 'var(--red)' }}></span>ค้างชำระค่าเช่า</div>
        </div>
      </div>

      {selectedRoom && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>ห้อง {selectedRoom.num}</h3>
            <div className="col gap-12" style={{ fontSize: '13.8px' }}>
              <div className="row between">
                <span style={{ color: 'var(--text-dim)' }}>สถานะ</span>
                <span className={`badge ${getStatusBadgeClass(selectedRoom.status)}`}>{selectedRoom.status}</span>
              </div>
              <div className="row between">
                <span style={{ color: 'var(--text-dim)' }}>ผู้พักอาศัย</span>
                <b>{selectedRoom.tenant}</b>
              </div>
              <div className="row between">
                <span style={{ color: 'var(--text-dim)' }}>เบอร์ติดต่อ</span>
                <span className="mono">{selectedRoom.phone}</span>
              </div>
              <div className="row between">
                <span style={{ color: 'var(--text-dim)' }}>ค่าเช่า/เดือน</span>
                <span className="mono">{selectedRoom.rent}</span>
              </div>
              <div className="row between">
                <span style={{ color: 'var(--text-dim)' }}>สถานะชำระเงิน</span>
                <span className={`badge ${selectedRoom.payStatus === 'ชำระแล้ว' ? 'b-green' : selectedRoom.payStatus === 'ค้างชำระ' ? 'b-red' : 'b-amber'}`}>
                  {selectedRoom.payStatus}
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>ปิด</button>
              <button type="button" className="btn btn-primary btn-sm">ดูประวัติทั้งหมด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}