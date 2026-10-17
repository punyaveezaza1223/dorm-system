import React, { useEffect, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import CustomDropdown from '../../components/CustomDropdown';

const API_URL = 'http://localhost:4000';

export default function Repair() {
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('ทั่วไป');

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);

  // =================================
  // Toast
  // =================================
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  // =================================
  // ดึงประวัติการแจ้งซ่อม
  // =================================
  const fetchRepairs = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('ไม่พบ token');
        return;
      }

      const response = await fetch(`${API_URL}/api/tenant/repairs`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถดึงข้อมูลได้');
      }

      setRepairs(data.data || []);
    } catch (error) {
      console.error('Fetch Repairs Error:', error);
      triggerToast('ไม่สามารถโหลดประวัติการแจ้งซ่อมได้');
    }
  };

  // โหลดประวัติเมื่อเปิดหน้า
  useEffect(() => {
    fetchRepairs();
  }, []);

  // =================================
  // ส่งเรื่องแจ้งซ่อม
  // =================================
  const handleSubmit = async () => {
    if (!category) {
      triggerToast('กรุณาเลือกหมวดหมู่ปัญหา');
      return;
    }

    if (!description.trim()) {
      triggerToast('กรุณากรอกรายละเอียดปัญหา');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('token');

      if (!token) {
        triggerToast('กรุณาเข้าสู่ระบบก่อนแจ้งซ่อม');
        return;
      }

      const response = await fetch(`${API_URL}/api/tenant/repairs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          description,
          urgency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'ไม่สามารถส่งเรื่องได้');
      }

      triggerToast('ส่งเรื่องแจ้งซ่อมเรียบร้อยแล้ว');

      // ล้างฟอร์ม
      setCategory('');
      setDescription('');
      setUrgency('ทั่วไป');

      // โหลดประวัติใหม่
      await fetchRepairs();
    } catch (error) {
      console.error('Create Repair Error:', error);
      triggerToast(error.message || 'ไม่สามารถส่งเรื่องแจ้งซ่อมได้');
    } finally {
      setLoading(false);
    }
  };

  // =================================
  // แปลงสถานะจาก Database เป็นภาษาไทย
  // =================================
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'รอดำเนินการ';

      case 'in_progress':
        return 'กำลังซ่อม';

      case 'completed':
        return 'เสร็จสิ้น';

      case 'cancelled':
        return 'ยกเลิก';

      default:
        return status || '-';
    }
  };

  // =================================
  // Class ของ Badge
  // =================================
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'b-amber';

      case 'in_progress':
        return 'b-amber';

      case 'completed':
        return 'b-green';

      case 'cancelled':
        return 'b-red';

      default:
        return 'b-amber';
    }
  };

  // =================================
  // Format วันที่
  // =================================
  const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="page" data-p="res-repair">

      {/* ================================= */}
      {/* Header */}
      {/* ================================= */}

      <div className="page-head">
        <div className="eyebrow">แจ้งซ่อม</div>

        <h2>แจ้งซ่อมและติดตามสถานะ</h2>

        <p>
          แจ้งปัญหาภายในห้องพัก แนบรูปภาพ และติดตามความคืบหน้าได้แบบเรียลไทม์
        </p>
      </div>

      <div className="two-col">

        {/* ================================= */}
        {/* ฟอร์มแจ้งซ่อม */}
        {/* ================================= */}

        <div className="card card-pad">

          <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>
            แจ้งซ่อมรายการใหม่
          </h4>

          {/* หมวดหมู่ */}
          <div className="field">
            <label>หมวดหมู่ปัญหา</label>

            <CustomDropdown
              options={[
                { value: 'ระบบประปา', label: 'ระบบประปา' },
                { value: 'ระบบไฟฟ้า', label: 'ระบบไฟฟ้า' },
                { value: 'เครื่องปรับอากาศ', label: 'เครื่องปรับอากาศ' },
                { value: 'ประตู / หน้าต่าง', label: 'ประตู / หน้าต่าง' },
                { value: 'อื่น ๆ', label: 'อื่น ๆ' },
              ]}
              value={category}
               onChange={(e) => setCategory(e.target.value)}
              aria-label="หมวดหมู่ปัญหา"
            />
          </div>

          {/* รายละเอียด */}
          <div className="field">

            <label>รายละเอียดปัญหา</label>

            <textarea
              rows="3"
              placeholder="อธิบายอาการหรือจุดที่ชำรุด"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

          </div>

          {/* ความเร่งด่วน */}
          <div className="field">

            <label>ระดับความเร่งด่วน</label>

            <div
              className="segment"
              style={{
                background: '#fff',
                border: '1.5px solid var(--line)',
              }}
            >

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

          {/* Upload */}
          <div className="field">

            <div className="upload-box">
              <ImagePlus size={22} strokeWidth={2} />

              ลากไฟล์มาวาง หรือ{' '}

              <b style={{ color: 'var(--brass-deep)' }}>
                เลือกไฟล์
              </b>
            </div>

          </div>

          {/* Submit */}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'กำลังส่งเรื่อง...' : 'ส่งเรื่องแจ้งซ่อม'}
          </button>

        </div>


        {/* ================================= */}
        {/* ประวัติแจ้งซ่อม */}
        {/* ================================= */}

        <div className="card card-pad">

          <h4 style={{ marginBottom: '14px', fontSize: '15px' }}>
            ประวัติการแจ้งซ่อม
          </h4>

          <div className="col gap-16">

            {repairs.length === 0 ? (

              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  color: 'var(--text-faint)',
                  fontSize: '13px',
                }}
              >
                ยังไม่มีประวัติการแจ้งซ่อม
              </div>

            ) : (

              repairs.map((repair) => (

                <div
                  className="row between"
                  style={{ alignItems: 'flex-start' }}
                  key={repair.id}
                >

                  <div>

                    <b style={{ fontSize: '13.8px' }}>
                      #{String(repair.id).padStart(4, '0')} {repair.category}
                    </b>

                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--text-faint)',
                        marginTop: '3px',
                      }}
                    >
                      {repair.description}
                    </div>

                    <div
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--text-faint)',
                        marginTop: '3px',
                      }}
                    >
                      แจ้ง {formatDate(repair.created_at)}
                    </div>

                  </div>

                  <span className={`badge ${getStatusClass(repair.status)}`}>
                    {getStatusText(repair.status)}
                  </span>

                </div>

              ))

            )}

          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* Toast */}
      {/* ================================= */}

      <div
        className={`toast ${showToast ? 'show' : ''}`}
        id="toast"
      >
        <span className="dot"></span>

        <span id="toastMsg">
          {toastMsg}
        </span>
      </div>

    </div>
  );
}