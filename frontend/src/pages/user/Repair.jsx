import React, { useState } from 'react';

export default function Repair() {
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [urgency, setUrgency] = useState('ทั่วไป');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  return (
    <div className="page" data-p="res-repair">
      <div className="page-head">
        <div className="eyebrow">แจ้งซ่อม</div>
        <h2>แจ้งซ่อมและติดตามสถานะ</h2>
        <p>แจ้งปัญหาภายในห้องพัก แนบรูปภาพ และติดตามความคืบหน้าได้แบบเรียลไทม์</p>
      </div>
      <div className="two-col">
        <div className="card card-pad">
          <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>แจ้งซ่อมรายการใหม่</h4>
          <div className="field">
            <label>หมวดหมู่ปัญหา</label>
            <select>
              <option>ระบบประปา</option>
              <option>ระบบไฟฟ้า</option>
              <option>เครื่องปรับอากาศ</option>
              <option>ประตู / หน้าต่าง</option>
              <option>อื่น ๆ</option>
            </select>
          </div>
          <div className="field">
            <label>รายละเอียดปัญหา</label>
            <textarea rows="3" placeholder="อธิบายอาการหรือจุดที่ชำรุด"></textarea>
          </div>
          <div className="field">
            <label>ระดับความเร่งด่วน</label>
            <div className="segment" style={{ background: '#fff', border: '1.5px solid var(--line)' }}>
              <button
                type="button"
                className={urgency === 'ทั่วไป' ? 'active' : ''}
                onClick={() => setUrgency('ทั่วไป')}
              >
                ทั่วไป
              </button>
              <button
                type="button"
                className={urgency === 'เร่งด่วน' ? 'active' : ''}
                onClick={() => setUrgency('เร่งด่วน')}
              >
                เร่งด่วน
              </button>
            </div>
          </div>
          <div className="field">
            <label>แนบรูปภาพประกอบ</label>
            <div className="upload-box">
              <span className="ic">📷</span>ลากไฟล์มาวาง หรือ <b style={{ color: 'var(--brass-deep)' }}>เลือกไฟล์</b>
            </div>
            <div className="chip">
              🖼 รูปก๊อกน้ำ.jpg <span className="x">✕</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => triggerToast('ส่งเรื่องแจ้งซ่อมแล้ว')}
          >
            ส่งเรื่องแจ้งซ่อม
          </button>
        </div>
        <div className="card card-pad">
          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>ประวัติการแจ้งซ่อม</h4>
          <div className="col gap-16">
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <b style={{ fontSize: '13.8px' }}>#RP-0142 ก๊อกน้ำห้องน้ำรั่ว</b>
                <div style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>แจ้ง 10 ก.ค. 2569</div>
              </div>
              <span className="badge b-amber">กำลังซ่อม</span>
            </div>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <b style={{ fontSize: '13.8px' }}>#RP-0138 แอร์ไม่เย็น</b>
                <div style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>แจ้ง 28 มิ.ย. 2569</div>
              </div>
              <span className="badge b-green">เสร็จสิ้น</span>
            </div>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <b style={{ fontSize: '13.8px' }}>#RP-0121 หลอดไฟหน้าห้องดับ</b>
                <div style={{ fontSize: '12.5px', color: 'var(--text-faint)' }}>แจ้ง 2 มิ.ย. 2569</div>
              </div>
              <span className="badge b-green">เสร็จสิ้น</span>
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