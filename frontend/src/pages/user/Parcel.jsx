import React from 'react';

export default function Parcel() {
  return (
    <div className="page" data-p="res-parcel">
      <div className="page-head">
        <div className="eyebrow">พัสดุ</div>
        <h2>ติดตามพัสดุของฉัน</h2>
        <p>ตรวจสอบสถานะพัสดุที่นิติฯ รับไว้แทน และรับแจ้งเตือนเมื่อพัสดุมาถึง</p>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่รับเข้า</th>
                <th>ผู้ส่ง / บริการขนส่ง</th>
                <th>หมายเลขพัสดุ</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">15/07/2569</td>
                <td>Shopee Express</td>
                <td className="mono">TH0092281</td>
                <td><span className="badge b-amber">รอรับที่นิติฯ</span></td>
                <td><button type="button" className="btn btn-ghost btn-sm">แจ้งว่ามารับแล้ว</button></td>
              </tr>
              <tr>
                <td className="mono">14/07/2569</td>
                <td>Kerry Express</td>
                <td className="mono">KEX7723190</td>
                <td><span className="badge b-amber">รอรับที่นิติฯ</span></td>
                <td><button type="button" className="btn btn-ghost btn-sm">แจ้งว่ามารับแล้ว</button></td>
              </tr>
              <tr>
                <td className="mono">10/07/2569</td>
                <td>Flash Express</td>
                <td className="mono">FL8820011</td>
                <td><span className="badge b-green">รับแล้ว</span></td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}