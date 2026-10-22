import { useEffect, useMemo, useState } from "react";
import { CARRIERS, OTHER_CARRIER } from "../../constants/carriers";

const API = "http://localhost:4000";

const emptyParcel = {
  room: "",
  trackingNumber: "",
  sender: "",
  customSender: "",
  parcelType: "พัสดุทั่วไป",
  description: "",
  note: "",
};

export default function Parcel() {
  const [parcels, setParcels] = useState([]);

  const [filter, setFilter] = useState("all");

  const [query, setQuery] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState(emptyParcel);

  const [toast, setToast] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  // =================================
  // Token
  // =================================

  const getToken = () => {
    return localStorage.getItem("token");
  };

  // =================================
  // API Response
  // ป้องกัน <!DOCTYPE html>
  // =================================

  const readResponse = async (response) => {
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error("API returned non-JSON:", text);

      throw new Error(`API ไม่ได้ส่ง JSON กลับมา (${response.status})`, {
        cause: error,
      });
    }
  };

  // =================================
  // Toast
  // =================================

  const showToast = (message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2600);
  };

  // =================================
  // โหลดพัสดุ
  // =================================

  const loadParcels = async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
      }

      const response = await fetch(`${API}/api/parcels`, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถโหลดข้อมูลพัสดุได้");
      }

      setParcels(result.data || []);
    } catch (error) {
      console.error("Load parcels error:", error);

      showToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => loadParcels());

    // โหลดข้อมูลครั้งแรกเมื่อเข้าหน้าเท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =================================
  // Format วันที่
  // =================================

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =================================
  // ค้นหา + Filter
  // =================================

  const visibleParcels = useMemo(() => {
    const term = query.trim().toLowerCase();

    return parcels.filter((parcel) => {
      const matchesFilter = filter === "all" || parcel.status === filter;

      const searchable = [
        parcel.room_number,
        parcel.recipient,
        parcel.sender,
        parcel.tracking_number,
        parcel.parcel_type,
      ];

      const matchesQuery =
        !term ||
        searchable.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        );

      return matchesFilter && matchesQuery;
    });
  }, [filter, parcels, query]);

  const totalPages = Math.max(1, Math.ceil(visibleParcels.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const paginatedParcels = visibleParcels.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const firstItem = visibleParcels.length
    ? (currentPage - 1) * pageSize + 1
    : 0;

  const lastItem = Math.min(currentPage * pageSize, visibleParcels.length);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));

    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [currentPage, totalPages]);

  // =================================
  // Stats
  // =================================

  const pendingCount = parcels.filter(
    (parcel) => parcel.status === "pending",
  ).length;

  const receivedCount = parcels.filter(
    (parcel) => parcel.status === "received",
  ).length;

  const todayCount = parcels.filter((parcel) => {
    if (!parcel.received_at) {
      return false;
    }

    const date = new Date(parcel.received_at);

    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }).length;

  // =================================
  // ยืนยันรับพัสดุ
  // =================================

  const markReceived = async (id) => {
    try {
      const token = getToken();

      const response = await fetch(`${API}/api/parcels/${id}/status`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          status: "received",
        }),
      });

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถอัปเดตสถานะได้");
      }

      showToast("บันทึกการรับพัสดุเรียบร้อย");

      await loadParcels();
    } catch (error) {
      console.error(error);

      showToast(error.message);
    }
  };

  // =================================
  // เพิ่มพัสดุ
  // =================================

  const addParcel = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);

      const sender = form.sender === OTHER_CARRIER
        ? form.customSender.trim()
        : form.sender.trim();

      if (!sender) {
        throw new Error("กรุณาเลือกหรือระบุบริษัทขนส่ง");
      }

      const token = getToken();

      if (!token) {
        throw new Error("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
      }

      const response = await fetch(`${API}/api/parcels`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          room: form.room.trim(),

          trackingNumber: form.trackingNumber.trim(),

          sender,

          parcelType: form.parcelType.trim(),

          description: form.description.trim(),

          note: form.note.trim(),
        }),
      });

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถบันทึกพัสดุได้");
      }

      setForm(emptyParcel);

      setShowForm(false);

      showToast("บันทึกพัสดุเรียบร้อย");

      await loadParcels();
    } catch (error) {
      console.error("Add parcel error:", error);

      showToast(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page" data-p="ad-parcel">
      {/* ========================= */}
      {/* Header */}
      {/* ========================= */}

      <div className="page-head">
        <div className="eyebrow">จัดการพัสดุ</div>

        <h2>รับเข้าและติดตามพัสดุผู้พัก</h2>

        <p>
          บันทึกพัสดุที่มาถึง ค้นหาผู้รับ และอัปเดตสถานะเมื่อผู้พักมารับแล้ว
        </p>
      </div>

      {/* ========================= */}
      {/* Stats */}
      {/* ========================= */}

      <div
        className="grid-3"
        style={{
          marginBottom: "22px",
        }}
      >
        <div className="card stat">
          <div className="label">พัสดุรอรับ</div>

          <div className="value">{pendingCount}</div>

          <div className="sub badge b-amber">รอผู้พักมารับ</div>
        </div>

        <div className="card stat">
          <div className="label">รับเข้าในวันนี้</div>

          <div className="value">{todayCount}</div>

          <div className="sub">รายการพัสดุใหม่</div>
        </div>

        <div className="card stat">
          <div className="label">รับแล้ว</div>

          <div className="value">{receivedCount}</div>

          <div className="sub badge b-green">ส่งมอบเรียบร้อย</div>
        </div>
      </div>

      {/* ========================= */}
      {/* Table */}
      {/* ========================= */}

      <div className="card card-pad">
        <div
          className="row between wrap gap-12"
          style={{
            marginBottom: "18px",
          }}
        >
          <div
            className="filterbar"
            style={{
              marginBottom: 0,
              flex: 1,
            }}
          >
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาห้อง ผู้รับ หรือเลขพัสดุ"
            />

            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">ทุกสถานะ</option>

              <option value="pending">รอรับ</option>

              <option value="received">รับแล้ว</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(true)}
          >
            + รับพัสดุใหม่
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>วันที่รับเข้า</th>

                <th>ห้อง</th>

                <th>ผู้รับ</th>

                <th>ผู้ส่ง</th>

                <th>ประเภท</th>

                <th>หมายเลขพัสดุ</th>

                <th>สถานะ</th>

                <th>การจัดการ</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="emptystate">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : visibleParcels.length > 0 ? (
                paginatedParcels.map((parcel) => (
                  <tr key={parcel.id}>
                    <td className="mono">{formatDate(parcel.received_at)}</td>

                    <td
                      className="mono"
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {parcel.room_number}
                    </td>

                    <td>{parcel.recipient}</td>

                    <td>{parcel.sender}</td>

                    <td>{parcel.parcel_type}</td>

                    <td className="mono">{parcel.tracking_number}</td>

                    <td>
                      <span
                        className={`badge ${
                          parcel.status === "pending" ? "b-amber" : "b-green"
                        }`}
                      >
                        {parcel.status === "pending" ? "รอรับ" : "รับแล้ว"}
                      </span>
                    </td>

                    <td>
                      {parcel.status === "pending" ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => markReceived(parcel.id)}
                        >
                          ยืนยันรับแล้ว
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="emptystate">
                    ไม่พบรายการพัสดุ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && visibleParcels.length > 0 && (
          <footer className="parcel-pagination">
            <label>
              แสดง
              <select
                aria-label="จำนวนรายการพัสดุต่อหน้า"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              รายการต่อหน้า
            </label>

            <span>
              แสดง {firstItem}–{lastItem} จาก {visibleParcels.length} รายการ
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
                  <button type="button" onClick={() => setPage(1)}>
                    1
                  </button>
                  <i>…</i>
                </>
              )}

              {pageNumbers.map((pageNumber) => (
                <button
                  type="button"
                  key={pageNumber}
                  className={pageNumber === currentPage ? "active" : ""}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                  <i>…</i>
                  <button type="button" onClick={() => setPage(totalPages)}>
                    {totalPages}
                  </button>
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

      {/* ========================= */}
      {/* Add Parcel Modal */}
      {/* ========================= */}

      {showForm && (
        <div
          className="modal-overlay active"
          onClick={() => setShowForm(false)}
        >
          <form
            className="modal"
            onSubmit={addParcel}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>รับพัสดุใหม่</h3>

            {/* ห้อง */}

            <div className="field">
              <label>ห้อง</label>

              <input
                required
                value={form.room}
                onChange={(event) =>
                  setForm({
                    ...form,
                    room: event.target.value,
                  })
                }
                placeholder="เช่น A09"
              />

              <small>ระบบจะค้นหาผู้พักจากห้องให้อัตโนมัติ</small>
            </div>

            {/* ผู้ส่ง */}

            <div className="field">
              <label>ผู้ส่ง / บริษัทขนส่ง</label>

              <select
                required
                value={form.sender}
                onChange={(event) =>
                  setForm({
                    ...form,
                    sender: event.target.value,
                    customSender: event.target.value === OTHER_CARRIER
                      ? form.customSender
                      : "",
                  })
                }
              >
                <option value="" disabled>เลือกบริษัทขนส่ง</option>
                {CARRIERS.map((carrier) => (
                  <option key={carrier.value} value={carrier.value}>
                    {carrier.label}
                  </option>
                ))}
                <option value={OTHER_CARRIER}>อื่น ๆ (ระบุเอง)</option>
              </select>

              {form.sender === OTHER_CARRIER && (
                <input
                  required
                  value={form.customSender}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      customSender: event.target.value,
                    })
                  }
                  placeholder="ระบุชื่อบริษัทขนส่ง"
                  style={{ marginTop: "10px" }}
                />
              )}
            </div>

            {/* Tracking */}

            <div className="field">
              <label>หมายเลขพัสดุ</label>

              <input
                required
                value={form.trackingNumber}
                onChange={(event) =>
                  setForm({
                    ...form,
                    trackingNumber: event.target.value,
                  })
                }
                placeholder="เช่น TH0092281"
              />
            </div>

            {/* ประเภท */}

            <div className="field">
              <label>ประเภทพัสดุ</label>

              <input
                value={form.parcelType}
                onChange={(event) =>
                  setForm({
                    ...form,
                    parcelType: event.target.value,
                  })
                }
                placeholder="เช่น พัสดุทั่วไป"
              />
            </div>

            {/* รายละเอียด */}

            <div className="field">
              <label>รายละเอียด</label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>

            {/* หมายเหตุ */}

            <div className="field">
              <label>หมายเหตุ</label>

              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm({
                    ...form,
                    note: event.target.value,
                  })
                }
                placeholder="หมายเหตุ (ถ้ามี)"
              />
            </div>

            {/* Buttons */}

            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowForm(false)}
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={saving}
              >
                {saving ? "กำลังบันทึก..." : "บันทึกพัสดุ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================= */}
      {/* Toast */}
      {/* ========================= */}

      <div className={`toast ${toast ? "show" : ""}`}>
        <span className="dot" />

        {toast}
      </div>
    </div>
  );
}
