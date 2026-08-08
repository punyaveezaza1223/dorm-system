import React, { useState } from 'react';

export default function Payment() {
  const [activeTab, setActiveTab] = useState('bill-rent');
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
    <div className="page" data-p="res-payment">
      <div className="page-head">
        <div className="eyebrow">การเงิน</div>
        <h2>ชำระค่าเช่า ค่าน้ำ ค่าไฟ และค่าส่วนกลาง</h2>
        <p>ตรวจสอบยอดค้างชำระและอัปโหลดหลักฐานการโอนเงินได้ทันที</p>
      </div>
      <div className="tabs">
        <button
          type="button"
          className={activeTab === 'bill-rent' ? 'active' : ''}
          onClick={() => setActiveTab('bill-rent')}
        >
          ค่าเช่า
        </button>
        <button
          type="button"
          className={activeTab === 'bill-util' ? 'active' : ''}
          onClick={() => setActiveTab('bill-util')}
        >
          ค่าน้ำ / ค่าไฟ / ส่วนกลาง
        </button>
      </div>

      {activeTab === 'bill-rent' && (
        <div data-rp="bill-rent">
          <div className="card card-pad" style={{ marginBottom: '18px' }}>
            <div className="row between wrap gap-16">
              <div>
                <div className="label" style={{ fontSize: '12.5px', color: 'var(--text-dim)', fontWeight: 600 }}>
                  ยอดค้างชำระเดือนสิงหาคม 2569
                </div>
                <div className="mono" style={{ fontSize: '28px', fontWeight: 600, color: 'var(--ink)' }}>
                  ฿6,500.00
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--red)', fontWeight: 600, marginTop: '4px' }}>
                  กำหนดชำระ 5 ส.ค. 2569
                </div>
              </div>
              <div className="col gap-8" style={{ minWidth: '220px' }}>
                <div className="upload-box" style={{ padding: '16px' }}>
                  <span className="ic">🧾</span>แนบสลิปการโอนเงิน
                </div>
                <button
                  type="button"
                  className="btn btn-brass"
                  onClick={() => triggerToast('ส่งหลักฐานการชำระแล้ว รอผู้ดูแลยืนยัน')}
                >
                  ส่งหลักฐานการชำระ
                </button>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>งวดเดือน</th>
                    <th>จำนวนเงิน</th>
                    <th>วันที่ชำระ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>กรกฎาคม 2569</td>
                    <td className="mono">฿6,500</td>
                    <td className="mono">02/07/2569</td>
                    <td><span className="badge b-green">ยืนยันแล้ว</span></td>
                  </tr>
                  <tr>
                    <td>มิถุนายน 2569</td>
                    <td className="mono">฿6,500</td>
                    <td className="mono">03/06/2569</td>
                    <td><span className="badge b-green">ยืนยันแล้ว</span></td>
                  </tr>
                  <tr>
                    <td>สิงหาคม 2569</td>
                    <td className="mono">฿6,500</td>
                    <td className="mono">—</td>
                    <td><span className="badge b-red">รอชำระ</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bill-util' && (
        <div data-rp="bill-util">
          <div className="grid-3" style={{ marginBottom: '18px' }}>
            <div className="card stat">
              <div className="label">ค่าน้ำ</div>
              <div className="value">฿182</div>
              <div className="sub badge b-green">ชำระแล้ว</div>
            </div>
            <div className="card stat">
              <div className="label">ค่าไฟ</div>
              <div className="value">฿460</div>
              <div className="sub badge b-green">ชำระแล้ว</div>
            </div>
            <div className="card stat">
              <div className="label">ค่าส่วนกลาง</div>
              <div className="value">฿200</div>
              <div className="sub badge b-green">ชำระแล้ว</div>
            </div>
          </div>
          <div className="card card-pad">
            <div className="row between wrap gap-16">
              <div style={{ fontSize: '13.5px', color: 'var(--text-dim)' }}>
                รอบบิลถัดไป: สิงหาคม 2569 · ประมาณการ ฿830
              </div>
              <div className="col gap-8" style={{ minWidth: '220px' }}>
                <div className="upload-box" style={{ padding: '14px' }}>
                  แนบสลิปค่าน้ำ-ไฟ-ส่วนกลาง
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => triggerToast('อัปโหลดหลักฐานแล้ว')}
                >
                  อัปโหลดหลักฐาน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${showToast ? 'show' : ''}`} id="toast">
        <span className="dot"></span>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}