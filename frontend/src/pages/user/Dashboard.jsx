import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="page" data-p="res-dashboard">
      <div className="page-head">
        <div className="eyebrow">สวัสดี, คุณณัฐชา</div>
        <h2>ภาพรวมห้องพักของคุณ</h2>
        <p>ติดตามสถานะการแจ้งซ่อม การชำระเงิน และข่าวสารล่าสุดจากผู้ดูแลได้ในหน้าเดียว</p>
      </div>
      <div className="grid-4" style={{ marginBottom: '22px' }}>
        <div className="card stat">
          <div className="label">ค่าเช่าเดือนนี้</div>
          <div className="value">฿6,500</div>
          <div className="sub badge b-amber">รอชำระ · 5 ส.ค.</div>
        </div>
        <div className="card stat">
          <div className="label">แจ้งซ่อมที่เปิดอยู่</div>
          <div className="value">1</div>
          <div className="sub">กำลังดำเนินการ</div>
        </div>
        <div className="card stat">
          <div className="label">พัสดุรอรับ</div>
          <div className="value">2</div>
          <div className="sub">ที่เคาน์เตอร์นิติฯ</div>
        </div>
        <div className="card stat">
          <div className="label">ค่าน้ำ-ไฟเดือนนี้</div>
          <div className="value">฿842</div>
          <div className="sub badge b-green">ชำระแล้ว</div>
        </div>
      </div>
      <div className="two-col">
        <div className="card card-pad">
          <div className="row between" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15.5px' }}>สถานะงานแจ้งซ่อมล่าสุด</h3>
            <span className="badge b-amber">กำลังดำเนินการ</span>
          </div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-dim)', margin: '0 0 16px' }}>
            #RP-2026-0142 · ก๊อกน้ำห้องน้ำรั่วซึม · แจ้งเมื่อ 10 ก.ค. 2569
          </p>
          <div className="steps">
            <div className="step done">
              <div className="circ">✓</div>
              <div className="lbl">แจ้งซ่อม</div>
            </div>
            <div className="step done">
              <div className="circ">✓</div>
              <div className="lbl">รับเรื่อง</div>
            </div>
            <div className="step now">
              <div className="circ">3</div>
              <div className="lbl">กำลังซ่อม</div>
            </div>
            <div className="step">
              <div className="circ">4</div>
              <div className="lbl">เสร็จสิ้น</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: '10px' }}
            onClick={() => navigate('/user/repair')}
          >
            ดูรายละเอียดทั้งหมด
          </button>
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: '15.5px', marginBottom: '14px' }}>ประกาศล่าสุด</h3>
          <div className="announce-item" style={{ paddingTop: 0 }}>
            <div className="tag-lbl">ประกาศทั่วไป</div>
            <h4>งดใช้น้ำชั่วคราว 18 ก.ค.</h4>
            <p>ทางนิติฯ จะดำเนินการซ่อมท่อเมนช่วง 09:00–12:00 น.</p>
            <div className="date">16 ก.ค. 2569</div>
          </div>
          <div className="announce-item">
            <div className="tag-lbl">ค่าใช้จ่าย</div>
            <h4>แจ้งรอบชำระค่าส่วนกลางใหม่</h4>
            <p>เริ่มใช้อัตราใหม่ตั้งแต่รอบบิลเดือนสิงหาคมเป็นต้นไป</p>
            <div className="date">12 ก.ค. 2569</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/user/announcement')}>
            ดูประกาศทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
}