import { useCallback, useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CarrierLogo } from '../../components/CarrierLogo';

const API = 'http://localhost:4000/api';
const PAGE_SIZE = 5;
const isPending = (status) => status === 'pending' || status === 'รอรับ';

export default function Parcel() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }, [navigate]);

  const loadParcels = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/tenant/parcels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'ไม่สามารถโหลดข้อมูลพัสดุได้');
      }

      setParcels(result.data || []);
    } catch (error) {
      console.error('Load tenant parcels error:', error);
      setMessage(error.message || 'ไม่สามารถโหลดข้อมูลพัสดุได้');
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    // The effect synchronizes the parcel list with the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadParcels();
  }, [loadParcels]);

  const markReceived = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setUpdatingId(id);
      setMessage('');
      const response = await fetch(`${API}/parcels/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'received' }),
      });
      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        handleUnauthorized();
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'ไม่สามารถยืนยันการรับพัสดุได้');
      }

      setMessage('ยืนยันรับพัสดุเรียบร้อย');
      await loadParcels();
    } catch (error) {
      console.error('Receive parcel error:', error);
      setMessage(error.message || 'ไม่สามารถยืนยันการรับพัสดุได้');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('th-TH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const pendingCount = parcels.filter((parcel) => isPending(parcel.status)).length;
  const totalPages = Math.max(1, Math.ceil(parcels.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedParcels = parcels.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const firstItem = parcels.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastItem = Math.min(currentPage * PAGE_SIZE, parcels.length);
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + index,
  );

  return (
    <div className="page" data-p="res-parcel">
      <div className="page-head">
        <div className="eyebrow">พัสดุ</div>
        <h2>ติดตามพัสดุของฉัน</h2>
        <p>รายการพัสดุจะแสดงเฉพาะของบัญชีผู้พักที่เข้าสู่ระบบอยู่</p>
      </div>

      {message && <div className="toast show" role="status"><span className="dot" />{message}</div>}

      <section className="parcel-pending-summary" aria-label="สรุปพัสดุรอรับ">
        <div className="parcel-pending-summary__icon" aria-hidden="true">
          <Package size={21} strokeWidth={2.2} />
        </div>
        <div>
          <span>พัสดุรอรับ</span>
          <strong>{pendingCount} ชิ้น</strong>
        </div>
        <p>
          {pendingCount
            ? 'กรุณามารับพัสดุที่สำนักงานนิติบุคคล'
            : 'ขณะนี้ไม่มีพัสดุที่รอรับ'}
        </p>
      </section>

      <section className="parcel-information-alert" role="note" aria-labelledby="parcel-rule-title">
        <span className="parcel-information-alert__icon" aria-hidden="true">i</span>
        <div>
          <h3 id="parcel-rule-title">ระเบียบการรับพัสดุ</h3>
          <ul>
            <li>โปรดแสดงเลขพัสดุหรือหลักฐานยืนยันตัวตนก่อนรับพัสดุ</li>
            <li>ตรวจสอบชื่อผู้รับและสภาพพัสดุให้เรียบร้อยก่อนกดยืนยันรับแล้ว</li>
            <li>กรุณารับพัสดุภายในระยะเวลา 9:00 น. - 22:00 น.</li>
          </ul>
        </div>
      </section>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่รับเข้า</th><th>ห้อง</th><th>ผู้ส่ง / บริการขนส่ง</th>
                <th>หมายเลขพัสดุ</th><th>สถานะ</th><th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="emptystate">กำลังโหลดข้อมูลพัสดุ...</td></tr>
              ) : parcels.length === 0 ? (
                <tr><td colSpan="6" className="emptystate">ยังไม่มีรายการพัสดุ</td></tr>
              ) : paginatedParcels.map((parcel) => {
                const pending = isPending(parcel.status);
                return (
                  <tr key={parcel.id}>
                    <td className="mono">{formatDate(parcel.received_at)}</td>
                    <td className="mono">{parcel.room_number || '-'}</td>
                    <td>
                      <div className="carrier-cell">
                        <CarrierLogo name={parcel.sender} />
                        <span>{parcel.sender || '-'}</span>
                      </div>
                    </td>
                    <td className="mono">{parcel.tracking_number || '-'}</td>
                    <td><span className={`badge ${pending ? 'b-amber' : 'b-green'}`}>{pending ? 'รอรับที่นิติฯ' : 'รับแล้ว'}</span></td>
                    <td>
                      {pending ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={updatingId === parcel.id}
                          onClick={() => markReceived(parcel.id)}
                        >
                          {updatingId === parcel.id ? 'กำลังบันทึก...' : 'ยืนยันรับแล้ว'}
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && parcels.length > 0 && (
          <footer className="parcel-pagination resident-parcel-pagination">
            <span>
              แสดง {firstItem}–{lastItem} จาก {parcels.length} รายการ
            </span>

            <nav aria-label="เปลี่ยนหน้ารายการพัสดุ">
              <button
                type="button"
                aria-label="หน้าก่อนหน้า"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                ‹
              </button>

              {pageNumbers[0] > 1 && (
                <>
                  <button type="button" onClick={() => setPage(1)}>1</button>
                  <i>…</i>
                </>
              )}

              {pageNumbers.map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  className={pageNumber === currentPage ? 'active' : ''}
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  <i>…</i>
                  <button type="button" onClick={() => setPage(totalPages)}>{totalPages}</button>
                </>
              )}

              <button
                type="button"
                aria-label="หน้าถัดไป"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                ›
              </button>
            </nav>
          </footer>
        )}
      </div>
    </div>
  );
}
