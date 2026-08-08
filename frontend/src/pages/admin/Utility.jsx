import React, { useState } from 'react';

export default function Utility() {
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
    <div className="page" data-p="ad-utility">
      <div className="page-head">
        <div className="eyebrow">บันทึกมิเตอร์</div>
        <h2>จัดการค่าน้ำ ค่าไฟ และค่าส่วนกลาง</h2>
        <p>บันทึกเลขมิเตอร์ประจำเดือน ออกใบแจ้งหนี้ และส่งยอดชำระให้ผู้เช่าแต่ละห้อง</p>
      </div>

      <div className="card card-pad" style={{ marginBottom: '22px' }}>
        <div className="row between wrap gap-16">
          <div className="row gap-12 wrap">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>ประจำเดือน</label>
              <select defaultValue="2026-08">
                <option value="2026-08">สิงหาคม 2569</option>
                <option value="2026-07">กรกฎาคม 2569</option>
                <option value="2026-06">มิถุนายน 2569</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>อาคาร</label>
              <select>
                <option value="A">ตึก A</option>
                <option value="B">ตึก B</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-brass"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => triggerToast('คำนวณและส่งใบแจ้งหนี้ไปยังทุกห้องแล้ว')}
          >
            ออกใบแจ้งหนี้ประจำเดือน
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ห้อง</th>
                <th>มิเตอร์น้ำ (เดิม ➔ ใหม่)</th>
                <th>ค่าน้ำ (฿)</th>
                <th>มิเตอร์ไฟ (เดิม ➔ ใหม่)</th>
                <th>ค่าไฟ (฿)</th>
                <th>ส่วนกลาง (฿)</th>
                <th>รวมทั้งหมด (฿)</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A01</td>
                <td className="mono">120 ➔ 120</td>
                <td className="mono">0</td>
                <td className="mono">840 ➔ 840</td>
                <td className="mono">0</td>
                <td className="mono">200</td>
                <td className="mono" style={{ fontWeight: 600 }}>200</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('บันทึกมิเตอร์ A01')}>
                    บันทึก
                  </button>
                </td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A02</td>
                <td className="mono">412 ➔ 421</td>
                <td className="mono">180</td>
                <td className="mono">2150 ➔ 2242</td>
                <td className="mono">460</td>
                <td className="mono">200</td>
                <td className="mono" style={{ fontWeight: 600 }}>840</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('บันทึกมิเตอร์ A02')}>
                    บันทึก
                  </button>
                </td>
              </tr>
              <tr>
                <td className="mono" style={{ fontWeight: 600 }}>A03</td>
                <td className="mono">305 ➔ 318</td>
                <td className="mono">260</td>
                <td className="mono">1890 ➔ 2010</td>
                <td className="mono">600</td>
                <td className="mono">200</td>
                <td className="mono" style={{ fontWeight: 600 }}>1,060</td>
                <td>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => triggerToast('บันทึกมิเตอร์ A03')}>
                    บันทึก
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