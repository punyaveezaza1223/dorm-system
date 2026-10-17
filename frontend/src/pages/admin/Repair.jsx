import React, { useEffect, useState } from 'react';
import CustomDropdown from '../../components/CustomDropdown';

const API_URL = 'http://localhost:4000';

export default function Repair() {
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  // =================================
  // โหลดรายการแจ้งซ่อมทั้งหมด
  // =================================

  const fetchRepairs = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');

      if (!token) {
        triggerToast('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      const response = await fetch(
        `${API_URL}/api/admin/repairs`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'ไม่สามารถโหลดรายการแจ้งซ่อมได้'
        );
      }

      setRepairs(data.data || []);

    } catch (error) {
      console.error('Fetch Admin Repairs Error:', error);
      triggerToast('ไม่สามารถโหลดรายการแจ้งซ่อมได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, []);


  // =================================
  // เปลี่ยนสถานะ
  // =================================

  const handleStatusChange = async (repairId, newStatus) => {
    try {
      setUpdatingId(repairId);

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/admin/repairs/${repairId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'ไม่สามารถอัปเดตสถานะได้'
        );
      }

      triggerToast('อัปเดตสถานะเรียบร้อยแล้ว');

      // โหลดข้อมูลใหม่
      await fetchRepairs();

    } catch (error) {
      console.error('Update Repair Error:', error);
      triggerToast(
        error.message || 'ไม่สามารถอัปเดตสถานะได้'
      );
    } finally {
      setUpdatingId(null);
    }
  };


  // =================================
  // แปลงสถานะเป็นภาษาไทย
  // =================================

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'รอรับเรื่อง';

      case 'in_progress':
        return 'กำลังซ่อม';

      case 'completed':
        return 'เสร็จสิ้น';

      case 'cancelled':
        return 'ยกเลิก';

      default:
        return '-';
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
        return 'b-rust';

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


  // =================================
  // Statistics
  // =================================

  const pendingCount = repairs.filter(
    (item) => item.status === 'pending'
  ).length;

  const inProgressCount = repairs.filter(
    (item) => item.status === 'in_progress'
  ).length;

  const completedCount = repairs.filter(
    (item) => item.status === 'completed'
  ).length;


  return (
    <div className="page" data-p="ad-repair">

      <div className="page-head">
        <div className="eyebrow">ระบบงานช่าง</div>

        <h2>จัดการรายการแจ้งซ่อม</h2>

        <p>
          รับเรื่อง แจ้งช่าง มอบหมายงาน และอัปเดตสถานะการซ่อมบำรุงให้ลูกบ้าน
        </p>
      </div>


      {/* ================================
          Statistics
      ================================= */}

      <div
        className="grid-3"
        style={{ marginBottom: '22px' }}
      >

        <div className="card stat">
          <div className="label">
            รายการแจ้งใหม่
          </div>

          <div className="value">
            {pendingCount}
          </div>

          <div className="sub badge b-amber">
            รอรับเรื่อง
          </div>
        </div>


        <div className="card stat">
          <div className="label">
            กำลังดำเนินการซ่อม
          </div>

          <div className="value">
            {inProgressCount}
          </div>

          <div className="sub badge b-rust">
            อยู่ระหว่างซ่อม
          </div>
        </div>


        <div className="card stat">
          <div className="label">
            ซ่อมเสร็จแล้ว
          </div>

          <div className="value">
            {completedCount}
          </div>

          <div className="sub badge b-green">
            เสร็จสมบูรณ์
          </div>
        </div>

      </div>


      {/* ================================
          Repair Table
      ================================= */}

      <div className="card">

        <div className="table-wrap">

          <table>

            <thead>
              <tr>
                <th>รหัส / วันที่</th>
                <th>ห้อง</th>
                <th>รายการแจ้งซ่อม</th>
                <th>ความเร่งด่วน</th>
                <th>สถานะ</th>
                <th>การจัดการสถานะ</th>
              </tr>
            </thead>


            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-faint)',
                    }}
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>

              ) : repairs.length === 0 ? (

                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-faint)',
                    }}
                  >
                    ยังไม่มีรายการแจ้งซ่อม
                  </td>
                </tr>

              ) : (

                repairs.map((repair) => (

                  <tr key={repair.id}>

                    {/* รหัส / วันที่ */}

                    <td>

                      <b style={{ fontSize: '13.5px' }}>
                        #RP-{String(repair.id).padStart(4, '0')}
                      </b>

                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-faint)',
                        }}
                      >
                        {formatDate(repair.created_at)}
                      </div>

                    </td>


                    {/* ห้อง */}

                    <td
                      className="mono"
                      style={{ fontWeight: 600 }}
                    >
                      {repair.room_number || '-'}
                    </td>


                    {/* รายละเอียด */}

                    <td>

                      <div>
                        <b>
                          {repair.description}
                        </b>
                      </div>

                      <div
                        style={{
                          fontSize: '12.5px',
                          color: 'var(--text-dim)',
                        }}
                      >
                        หมวด: {repair.category}
                      </div>

                    </td>


                    {/* ความเร่งด่วน */}

                    <td>

                      <span
                        className={`badge ${
                          repair.urgency === 'เร่งด่วน'
                            ? 'b-red'
                            : 'b-amber'
                        }`}
                      >
                        {repair.urgency}
                      </span>

                    </td>


                    {/* สถานะ */}

                    <td>

                      <span
                        className={`badge ${getStatusClass(
                          repair.status
                        )}`}
                      >
                        {getStatusText(repair.status)}
                      </span>

                    </td>


                    {/* เปลี่ยนสถานะ */}

                    <td>

                      {repair.status === 'completed' ||
                      repair.status === 'cancelled' ? (

                        <span
                          style={{
                            color: 'var(--text-faint)',
                            fontSize: '13px',
                          }}
                        >
                          —
                        </span>

                      ) : (

                        <CustomDropdown
                          value={repair.status}
                          disabled={updatingId === repair.id}
                          aria-label={`อัปเดตสถานะแจ้งซ่อม ${repair.id}`}
                          onChange={(e) =>
                            handleStatusChange(
                              repair.id,
                              e.target.value
                            )
                          }
                          options={[
                            {
                              value: 'pending',
                              label: 'รับเรื่อง',
                            },
                            {
                              value: 'in_progress',
                              label: 'กำลังซ่อม',
                            },
                            {
                              value: 'completed',
                              label: 'เสร็จสิ้น',
                            },
                            {
                              value: 'cancelled',
                              label: 'ยกเลิก',
                            },
                          ]}
                        />

                      )}

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

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