import React, { useState } from 'react';

export default function Repair() {
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  return (
    <div className="page" data-p="ad-repair">
      <div className="page-head">
        <div className="eyebrow">ระบบงานช่าง</div>
        <h2>จัดการรายการแจ้งซ่อม</h2>
        <p>รับเรื่อง แจ้งช่าง มอบหมายงาน และอัปเดตสถานะการซ่อมบำรุงให้ลูกบ้าน</p>
      </div>

      <div className="grid-3" style={{ marginBottom: '22px' }}>
        <div className="card stat">
          <div className="label">รายการแจ้งใหม่</div>
          <div className="value">2</div>
          <div className="sub badge b-amber">รอรับเรื่อง</div>
        </div>
        <div className="card stat">
          <div className="label">กำลังดำเนินการซ่อม</div>
          <div className="value">5</div>
          <div className="sub badge b-rust">อยู่ระหว่างซ่อม</div>
        </div>
        <div className="card stat">
          <div className="label">ซ่อมเสร็จเดือนนี้</div>
          <div className="value">18</div>
          <div className="sub badge b-green">เสร็จสมบูรณ์</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัส / วันที่</th>
                <th>ห้อง</th>
                <th>รายการแจ้งซ่อม</th>
                <th>ความเร่งด่วน</th>
                <th>สถานะ</th>
                <th>การจัดการสถานะ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <b style={{ fontSize: '13.5px' }}>#RP-0142</b>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>10 ก.ค. 2569</div>
                </td>
                <td className="mono" style={{ fontWeight: 600 }}>A12</td>
                <td>
                  <div><b>ก๊อกน้ำห้องน้ำรั่วซึม</b></div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>หมวด: ระบบประปา</div>
                </td>
                <td><span className="badge b-amber">ทั่วไป</span></td>
                <td><span className="badge b-rust">กำลังซ่อม</span></td>
                <td>
                  <select
                    defaultValue="in-progress"
                    onChange={(e) => triggerToast(`อัปเดตสถานะเป็น ${e.target.options[e.target.selectedIndex].text}`)}
                    style={{ padding: '6px 10px', borderRadius: '7px', border: '1.5px solid var(--line)', fontSize: '13px' }}
                  >
                    <option value="pending">รับเรื่อง</option>
                    <option value="in-progress">กำลังซ่อม</option>
                    <option value="completed">เสร็จสิ้น</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>
                  <b style={{ fontSize: '13.5px' }}>#RP-0143</b>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>15 ก.ค. 2569</div>
                </td>
                <td className="mono" style={{ fontWeight: 600 }}>A04</td>
                <td>
                  <div><b>แอร์มีน้ำหยดหนักมาก</b></div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>หมวด: เครื่องปรับอากาศ</div>
                </td>
                <td><span className="badge b-red">เร่งด่วน</span></td>
                <td><span className="badge b-amber">รอรับเรื่อง</span></td>
                <td>
                  <select
                    defaultValue="pending"
                    onChange={(e) => triggerToast(`อัปเดตสถานะเป็น ${e.target.options[e.target.selectedIndex].text}`)}
                    style={{ padding: '6px 10px', borderRadius: '7px', border: '1.5px solid var(--line)', fontSize: '13px' }}
                  >
                    <option value="pending">รับเรื่อง</option>
                    <option value="in-progress">กำลังซ่อม</option>
                    <option value="completed">เสร็จสิ้น</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td>
                  <b style={{ fontSize: '13.5px' }}>#RP-0138</b>
                  <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>28 มิ.ย. 2569</div>
                </td>
                <td className="mono" style={{ fontWeight: 600 }}>A12</td>
                <td>
                  <div><b>แอร์ไม่เย็น (ล้างแอร์)</b></div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>หมวด: เครื่องปรับอากาศ</div>
                </td>
                <td><span className="badge b-amber">ทั่วไป</span></td>
                <td><span className="badge b-green">เสร็จสิ้น</span></td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={`toast ${showToast ? 'show' : ''}`} id="toast">
        <span className="dot"></span>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}