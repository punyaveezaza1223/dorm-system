import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:4000/api';
const isPending = (status) => status === 'pending' || status === 'รอรับ';

export default function Parcel() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

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

  return (
    <div className="page" data-p="res-parcel">
      <div className="page-head">
        <div className="eyebrow">พัสดุ</div>
        <h2>ติดตามพัสดุของฉัน</h2>
        <p>รายการพัสดุจะแสดงเฉพาะของบัญชีผู้พักที่เข้าสู่ระบบอยู่</p>
      </div>

      {message && <div className="toast show" role="status"><span className="dot" />{message}</div>}

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
              ) : parcels.map((parcel) => {
                const pending = isPending(parcel.status);
                return (
                  <tr key={parcel.id}>
                    <td className="mono">{formatDate(parcel.received_at)}</td>
                    <td className="mono">{parcel.room_number || '-'}</td>
                    <td>{parcel.sender}</td>
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
      </div>
    </div>
  );
}
