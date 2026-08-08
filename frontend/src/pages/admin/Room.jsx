import React, { useState } from 'react';

export default function Room() {
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
    <div className="page" data-p="ad-room">
      <div className="page-head">
        <div className="eyebrow">จัดการห้องพัก</div>
        <h2>ข้อมูลห้องพักและสัญญาเช่า</h2>
        <p>จัดการสัญญาเช่า เพิ่ม/แก้ไขข้อมูลผู้เช่า และบันทึกประวัติการเข้าพัก</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '22px' }}>
        <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>ค้นหา / กรองข้อมูลห้องพัก</h4>
        <div className="grid-3">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>ค้นหาตามเลขห้องหรือชื่อ</label>
            <input type="text" placeholder="เช่น A102, ณัฐชา" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>สถานะห้อง</label>
            <select>
              <option value="">ทั้งหมด</option>
              <option value="empty">ว่าง</option>
              <option value="occupied">มีผู้พัก</option>
              <option value="repair">แจ้งซ่อม</option>
              <option value="due">ค้างชำระ</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
              onClick={() => triggerToast('บันทึกการปรับปรุงข้อมูลเรียบร้อย')}
            >
              + เพิ่มห้องพักใหม่
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เลขห้อง</th>
                <th>อาคาร / ชั้น</th>
                <th>ผู้เช่าปัจจุบัน</th>
                <th>เบอร์โทรศัพท์</th>
                <th>ค่าเช่า/เดือน</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A01</td>
                <td>ตึก A · ชั้น 1</td>
                <td>—</td>
                <td className="mono">—</td>
                <td className="mono">฿5,500</td>
                <td><span className="badge b-green">ว่าง</span></td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('ทำสัญญาใหม่')}>
                    ทำสัญญา
                  </button>
                </td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A02</td>
                <td>ตึก A · ชั้น 1</td>
                <td>นางสาวณัฐชา วงศ์ทอง</td>
                <td className="mono">081-234-5678</td>
                <td className="mono">฿6,500</td>
                <td><span className="badge b-amber">มีผู้พัก</span></td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('แก้ไขข้อมูล A02')}>
                    แก้ไข
                  </button>
                </td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A04</td>
                <td>ตึก A · ชั้น 1</td>
                <td>นายกิตติ จันทร์เพ็ญ</td>
                <td className="mono">086-111-2222</td>
                <td className="mono">฿6,500</td>
                <td><span className="badge b-rust">แจ้งซ่อม</span></td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('แก้ไขข้อมูล A04')}>
                    แก้ไข
                  </button>
                </td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A06</td>
                <td>ตึก A · ชั้น 1</td>
                <td>นายสมชาย ใจดี</td>
                <td className="mono">089-765-4321</td>
                <td className="mono">฿9,000</td>
                <td><span className="badge b-red">ค้างชำระ</span></td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('ส่งการเตือนชำระ')}>
                    แจ้งเตือน
                  </button>
                </td>
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