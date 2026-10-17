import React, { useState } from 'react';

export default function Payment() {
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
    <div className="page" data-p="ad-payment">
      <div className="page-head">
        <div className="eyebrow">ตรวจสอบการเงิน</div>
        <h2>รายการชำระเงินและตรวจสอบสลิป</h2>
        <p>อนุมัติหลักฐานการโอนเงินค่าเช่า ค่าน้ำ ค่าไฟ และค่าน้ำส่วนกลางจากผู้เช่า</p>
      </div>

      <div className="grid-3" style={{ marginBottom: '22px' }}>
        <div className="card stat">
          <div className="label">รออนุมัติสลิป</div>
          <div className="value">4</div>
          <div className="sub badge b-amber">ต้องตรวจสอบ</div>
        </div>
        <div className="card stat">
          <div className="label">ยอดจัดเก็บเดือนนี้</div>
          <div className="value">฿248,500</div>
          <div className="sub badge b-green">85% ของเป้าหมาย</div>
        </div>
        <div className="card stat">
          <div className="label">ค้างชำระทั้งหมด</div>
          <div className="value">฿22,000</div>
          <div className="sub badge b-red">3 รายการ</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ห้อง</th>
                <th>ผู้เช่า</th>
                <th>รายการ / งวด</th>
                <th>จำนวนเงิน</th>
                <th>วันที่ส่ง</th>
                <th>หลักฐาน</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A09</td>
                <td>นายวีระ พงษ์ไพร</td>
                <td>ค่าเช่า (ส.ค. 69)</td>
                <td className="mono">฿6,500</td>
                <td className="mono">30/07/2569</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm">ดูสลิป</button>
                </td>
                <td><span className="badge b-amber">รอตรวจสอบ</span></td>
                <td>
                  <div className="row gap-8">
                    <button
                      type="button"
                      className="btn btn-brass btn-sm"
                      onClick={() => triggerToast('อนุมัติการชำระเงินห้อง A09 สำเร็จ')}
                    >
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => triggerToast('ปฏิเสธรายการแล้ว')}
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A02</td>
                <td>นางสาวณัฐชา วงศ์ทอง</td>
                <td>ค่าน้ำ-ไฟ (ก.ค. 69)</td>
                <td className="mono">฿842</td>
                <td className="mono">28/07/2569</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm">ดูสลิป</button>
                </td>
                <td><span className="badge b-green">อนุมัติแล้ว</span></td>
                <td>—</td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A06</td>
                <td>นายสมชาย ใจดี</td>
                <td>ค่าเช่า (ก.ค. 69)</td>
                <td className="mono">฿9,000</td>
                <td className="mono">—</td>
                <td>—</td>
                <td><span className="badge b-red">ยังไม่ชำระ</span></td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => triggerToast('ส่งการเตือนชำระเงินเรียบร้อย')}
                  >
                    ส่งเตือน
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