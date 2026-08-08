import React from 'react';

export default function Announcement() {
  return (
    <div className="page" data-p="res-announce">
      <div className="page-head">
        <div className="eyebrow">ข่าวสาร</div>
        <h2>ประกาศจากผู้ดูแล</h2>
        <p>ติดตามประกาศและข่าวสารทั้งหมดจากนิติบุคคล/ผู้ดูแลอาคาร</p>
      </div>
      <div className="card card-pad">
        <div className="announce-item">
          <div className="tag-lbl">ประกาศทั่วไป</div>
          <h4>งดใช้น้ำชั่วคราว 18 ก.ค. 2569</h4>
          <p>ทางนิติฯ จะดำเนินการซ่อมท่อเมนช่วง 09:00–12:00 น. ขออภัยในความไม่สะดวก</p>
          <div className="date">16 ก.ค. 2569</div>
        </div>
        <div className="announce-item">
          <div className="tag-lbl">ค่าใช้จ่าย</div>
          <h4>แจ้งรอบชำระค่าส่วนกลางใหม่</h4>
          <p>เริ่มใช้อัตราใหม่ตั้งแต่รอบบิลเดือนสิงหาคมเป็นต้นไป ตามมติที่ประชุม</p>
          <div className="date">12 ก.ค. 2569</div>
        </div>
        <div className="announce-item">
          <div className="tag-lbl">กิจกรรม</div>
          <h4>ทำความสะอาดพื้นที่ส่วนกลางประจำเดือน</h4>
          <p>วันเสาร์ที่ 25 ก.ค. เวลา 08:00 น. บริเวณลานจอดรถและสระว่ายน้ำ</p>
          <div className="date">8 ก.ค. 2569</div>
        </div>
        <div className="announce-item">
          <div className="tag-lbl">ความปลอดภัย</div>
          <h4>ปรับปรุงระบบกล้องวงจรปิด</h4>
          <p>ติดตั้งกล้องเพิ่มเติมบริเวณทางเข้า-ออกและลิฟต์ทุกตัว</p>
          <div className="date">1 ก.ค. 2569</div>
        </div>
      </div>
    </div>
  );
}