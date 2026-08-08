import React, { useState } from 'react';

export default function Complaint() {
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  return (
    <div className="page" data-p="res-complaint">
      <div className="page-head">
        <div className="eyebrow">ร้องเรียน</div>
        <h2>แจ้งเรื่องร้องเรียน</h2>
        <p>แจ้งปัญหาที่ไม่เกี่ยวกับการซ่อมบำรุง เช่น เสียงรบกวน ความปลอดภัย หรือการบริการ</p>
      </div>
      <div className="two-col">
        <div className="card card-pad">
          <div className="field">
            <label>หัวข้อร้องเรียน</label>
            <input type="text" placeholder="สรุปเรื่องสั้น ๆ" />
          </div>
          <div className="field">
            <label>ประเภท</label>
            <select>
              <option>เสียงรบกวน</option>
              <option>ความปลอดภัย</option>
              <option>ความสะอาดพื้นที่ส่วนกลาง</option>
              <option>พฤติกรรมพนักงาน/ผู้พักอาศัย</option>
              <option>อื่น ๆ</option>
            </select>
          </div>
          <div className="field">
            <label>รายละเอียด</label>
            <textarea rows="4" placeholder="อธิบายเหตุการณ์ วันเวลา และสถานที่"></textarea>
          </div>
          <div className="field">
            <label>เก็บเป็นความลับ</label>
            <div className="segment" style={{ background: '#fff', border: '1.5px solid var(--line)' }}>
              <button
                type="button"
                className={isAnonymous ? 'active' : ''}
                onClick={() => setIsAnonymous(true)}
              >
                ไม่ระบุชื่อ
              </button>
              <button
                type="button"
                className={!isAnonymous ? 'active' : ''}
                onClick={() => setIsAnonymous(false)}
              >
                ระบุชื่อฉัน
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => triggerToast('ส่งเรื่องร้องเรียนแล้ว')}
          >
            ส่งเรื่องร้องเรียน
          </button>
        </div>
        <div className="card card-pad">
          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>เรื่องร้องเรียนของฉัน</h4>
          <div className="col gap-16">
            <div className="row between">
              <div>
                <b style={{ fontSize: '13.8px' }}>เสียงดังจากห้อง B07</b>
                <div style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>6 ก.ค. 2569</div>
              </div>
              <span className="badge b-amber">กำลังตรวจสอบ</span>
            </div>
            <div className="row between">
              <div>
                <b style={{ fontSize: '13.8px' }}>ไฟทางเดินชั้น 2 ดับ</b>
                <div style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>20 มิ.ย. 2569</div>
              </div>
              <span className="badge b-green">ดำเนินการแล้ว</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`toast ${showToast ? 'show' : ''}`} id="toast">
        <span className="dot"></span>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}