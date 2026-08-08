import React, { useState } from 'react';

export default function Announcement() {
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
    <div className="page" data-p="ad-announce">
      <div className="page-head">
        <div className="eyebrow">จัดการประกาศ</div>
        <h2>ประกาศข่าวสารและแจ้งเตือนลูกบ้าน</h2>
        <p>สร้างประกาศ ข่าวสาร หรือการแจ้งเตือนสำคัญส่งตรงถึงแอปพลิเคชันของลูกบ้าน</p>
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>สร้างประกาศใหม่</h4>
          <div className="field">
            <label>หัวข้อประกาศ</label>
            <input type="text" placeholder="ระบุหัวข้อข่าวสารหรือประกาศ" />
          </div>
          <div className="field">
            <label>หมวดหมู่</label>
            <select>
              <option>ประกาศทั่วไป</option>
              <option>ค่าใช้จ่าย</option>
              <option>กิจกรรม</option>
              <option>ความปลอดภัย</option>
            </select>
          </div>
          <div className="field">
            <label>รายละเอียด</label>
            <textarea rows="4" placeholder="กรอกข้อความและรายละเอียดประกาศ..."></textarea>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => triggerToast('เผยแพร่ประกาศเรียบร้อยแล้ว')}
          >
            เผยแพร่ประกาศ
          </button>
        </div>

        <div className="card card-pad">
          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>ประวัติประกาศทั้งหมด</h4>
          <div className="col gap-16">
            <div className="announce-item" style={{ paddingTop: 0 }}>
              <div className="row between">
                <span className="tag-lbl">ประกาศทั่วไป</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)' }}
                  onClick={() => triggerToast('ลบประกาศแล้ว')}
                >
                  ลบ
                </button>
              </div>
              <h4>งดใช้น้ำชั่วคราว 18 ก.ค. 2569</h4>
              <p>ทางนิติฯ จะดำเนินการซ่อมท่อเมนช่วง 09:00–12:00 น.</p>
              <div className="date">16 ก.ค. 2569</div>
            </div>

            <div className="announce-item">
              <div className="row between">
                <span className="tag-lbl">ค่าใช้จ่าย</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--red)' }}
                  onClick={() => triggerToast('ลบประกาศแล้ว')}
                >
                  ลบ
                </button>
              </div>
              <h4>แจ้งรอบชำระค่าส่วนกลางใหม่</h4>
              <p>เริ่มใช้อัตราใหม่ตั้งแต่รอบบิลเดือนสิงหาคมเป็นต้นไป</p>
              <div className="date">12 ก.ค. 2569</div>
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