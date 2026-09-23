import React, { useEffect, useState } from 'react';
import CustomDropdown from '../../components/CustomDropdown';

export default function Complaint() {
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [isAnonymous, setIsAnonymous] = useState(true);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);


  // =====================================
  // Toast
  // =====================================

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };


  // =====================================
  // โหลดประวัติร้องเรียน
  // =====================================

  const loadComplaints = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        return;
      }

      const response = await fetch(
        'http://localhost:4000/api/tenant/complaints',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setComplaints(result.data || []);
      }

    } catch (error) {
      console.error(
        'Load Complaints Error:',
        error
      );
    } finally {
      setLoadingHistory(false);
    }
  };


  useEffect(() => {
    loadComplaints();
  }, []);


  // =====================================
  // ส่งเรื่องร้องเรียน
  // =====================================

  const handleSubmit = async () => {

    // ตรวจสอบข้อมูล
    if (!title.trim()) {
      triggerToast('กรุณากรอกหัวข้อร้องเรียน');
      return;
    }

    if (!type) {
      triggerToast('กรุณาเลือกประเภท');
      return;
    }

    if (!description.trim()) {
      triggerToast('กรุณากรอกรายละเอียด');
      return;
    }


    try {
      setLoading(true);

      const token = localStorage.getItem('token');

      if (!token) {
        triggerToast('กรุณาเข้าสู่ระบบใหม่');
        return;
      }


      const response = await fetch(
        'http://localhost:4000/api/tenant/complaints',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            title: title.trim(),
            type,
            description: description.trim(),
            isAnonymous,
          }),
        }
      );


      const result = await response.json();


      if (!response.ok || !result.success) {
        triggerToast(
          result.message ||
          'ไม่สามารถส่งเรื่องร้องเรียนได้'
        );
        return;
      }


      // สำเร็จ
      triggerToast(
        'ส่งเรื่องร้องเรียนเรียบร้อยแล้ว'
      );


      // ล้างฟอร์ม
      setTitle('');
      setType('');
      setDescription('');
      setIsAnonymous(true);


      // โหลดประวัติใหม่
      await loadComplaints();

    } catch (error) {

      console.error(
        'Create Complaint Error:',
        error
      );

      triggerToast(
        'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================
  // แปลง Status
  // =====================================

  const complaintStatus = (status) => {

    if (status === 'resolved') {
      return {
        label: 'ดำเนินการแล้ว',
        className: 'b-green',
      };
    }

    if (status === 'in_progress') {
      return {
        label: 'กำลังตรวจสอบ',
        className: 'b-amber',
      };
    }

    if (status === 'cancelled') {
      return {
        label: 'ยกเลิก',
        className: 'b-red',
      };
    }

    return {
      label: 'รอตรวจสอบ',
      className: 'b-amber',
    };
  };


  // =====================================
  // Render
  // =====================================

  return (
    <div
      className="page"
      data-p="res-complaint"
    >

      <div className="page-head">

        <div className="eyebrow">
          ร้องเรียน
        </div>

        <h2>
          แจ้งเรื่องร้องเรียน
        </h2>

        <p>
          แจ้งปัญหาที่ไม่เกี่ยวกับการซ่อมบำรุง
          เช่น เสียงรบกวน ความปลอดภัย
          หรือการบริการ
        </p>

      </div>


      <div className="two-col">

        {/* =================================
            FORM
        ================================= */}
        <div className="card card-pad">

          {/* หัวข้อ */}
          <div className="field">

            <label>
              หัวข้อร้องเรียน
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="สรุปเรื่องสั้น ๆ"
            />

          </div>


          {/* ประเภท */}
          <div className="field">

            <label>
              ประเภท
            </label>

            <CustomDropdown
              options={[
                {
                  value: 'เสียงรบกวน',
                  label: 'เสียงรบกวน',
                },
                {
                  value: 'ความปลอดภัย',
                  label: 'ความปลอดภัย',
                },
                {
                  value: 'ความสะอาดพื้นที่ส่วนกลาง',
                  label: 'ความสะอาดพื้นที่ส่วนกลาง',
                },
                {
                  value: 'พฤติกรรมพนักงาน/ผู้พักอาศัย',
                  label: 'พฤติกรรมพนักงาน/ผู้พักอาศัย',
                },
                {
                  value: 'อื่น ๆ',
                  label: 'อื่น ๆ',
                },
              ]}

              value={type}

              onChange={(e) =>
                setType(e.target.value)
              }

              aria-label="ประเภท"
            />

          </div>


          {/* รายละเอียด */}
          <div className="field">

            <label>
              รายละเอียด
            </label>

            <textarea
              rows="4"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="อธิบายเหตุการณ์ วันเวลา และสถานที่"
            />

          </div>


          {/* ไม่ระบุชื่อ */}
          <div className="field">

            <label>
              เก็บเป็นความลับ
            </label>

            <div
              className="segment"
              style={{
                background: '#fff',
                border: '1.5px solid var(--line)',
              }}
            >

              <button
                type="button"
                className={
                  isAnonymous
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setIsAnonymous(true)
                }
              >
                ไม่ระบุชื่อ
              </button>

              <button
                type="button"
                className={
                  !isAnonymous
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setIsAnonymous(false)
                }
              >
                ระบุชื่อฉัน
              </button>

            </div>

          </div>


          {/* Submit */}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? 'กำลังส่ง...'
              : 'ส่งเรื่องร้องเรียน'}
          </button>

        </div>


        {/* =================================
            HISTORY
        ================================= */}
        <div className="card card-pad">

          <h4
            style={{
              marginBottom: '14px',
              fontSize: '15px',
            }}
          >
            เรื่องร้องเรียนของฉัน
          </h4>


          {loadingHistory ? (

            <div className="resident-empty">
              กำลังโหลดข้อมูล...
            </div>

          ) : complaints.length ? (

            <div className="col gap-16">

              {complaints.map((complaint) => {

                const status =
                  complaintStatus(
                    complaint.status
                  );

                return (
                  <div
                    className="row between"
                    key={complaint.id}
                  >

                    <div>

                      <b
                        style={{
                          fontSize: '13.8px',
                        }}
                      >
                        {complaint.title}
                      </b>

                      <div
                        style={{
                          fontSize: '12.5px',
                          color:
                            'var(--text-faint)',
                        }}
                      >
                        {formatComplaintDate(
                          complaint.created_at
                        )}
                      </div>

                    </div>

                    <span
                      className={`badge ${status.className}`}
                    >
                      {status.label}
                    </span>

                  </div>
                );
              })}

            </div>

          ) : (

            <div className="resident-empty">
              ยังไม่มีเรื่องร้องเรียน
            </div>

          )}

        </div>

      </div>


      {/* Toast */}
      <div
        className={`toast ${
          showToast ? 'show' : ''
        }`}
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


// =====================================
// วันที่สำหรับประวัติ
// =====================================

const formatComplaintDate = (date) => {

  if (!date) {
    return '—';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    'th-TH',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
};

