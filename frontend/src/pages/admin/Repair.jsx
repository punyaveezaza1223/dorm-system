import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Wrench,
  X,
} from "lucide-react";

const API = "http://localhost:4000/api";
const PAGE_SIZE = 5;
const statuses = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอรับเรื่อง" },
  { value: "in_progress", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "cancelled", label: "ยกเลิก" },
];
const statusLabel = (status) =>
  ({
    pending: "รอรับเรื่อง",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  })[status] ||
  status ||
  "-";
const statusClass = (status) =>
  ({
    pending: "pending",
    in_progress: "in-progress",
    completed: "completed",
    cancelled: "cancelled",
  })[status] || "pending";
const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";
const shortText = (value, length = 58) =>
  value && value.length > length ? `${value.slice(0, length)}…` : value || "-";
async function json(response) {
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "ไม่สามารถทำรายการได้");
  return data;
}

function ImageViewer({ images, index, setIndex, close }) {
  if (index < 0) return null;
  return (
    <div
      className="repair-image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="ภาพแจ้งซ่อมขยาย"
      onClick={close}
    >
      <button
        className="repair-viewer-close"
        type="button"
        onClick={close}
        aria-label="ปิดภาพ"
      >
        <X />
      </button>
      {images.length > 1 && (
        <button
          className="repair-viewer-prev"
          type="button"
          aria-label="รูปก่อนหน้า"
          onClick={(event) => {
            event.stopPropagation();
            setIndex(
              (current) => (current - 1 + images.length) % images.length,
            );
          }}
        >
          <ChevronLeft />
        </button>
      )}
      <img
        src={images[index]}
        alt="ภาพแจ้งซ่อมขยาย"
        onClick={(event) => event.stopPropagation()}
      />
      {images.length > 1 && (
        <button
          className="repair-viewer-next"
          type="button"
          aria-label="รูปถัดไป"
          onClick={(event) => {
            event.stopPropagation();
            setIndex((current) => (current + 1) % images.length);
          }}
        >
          <ChevronRight />
        </button>
      )}
    </div>
  );
}

export default function Repair() {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(-1);
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      const data = await json(
        await fetch(`${API}/admin/repairs`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      const hydrated = await Promise.all(
        (data.data || []).map(async (repair) => {
          const images = (
            await Promise.all(
              (repair.images || []).map(async (image) => {
                const response = await fetch(
                  `http://localhost:4000${image.url}`,
                  { headers: { Authorization: `Bearer ${token}` } },
                );
                return response.ok
                  ? {
                      ...image,
                      preview: URL.createObjectURL(await response.blob()),
                    }
                  : null;
              }),
            )
          ).filter(Boolean);
          return { ...repair, images };
        }),
      );
      setRepairs(hydrated);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [query, filter]);
  const updateStatus = async (repair, status) => {
    try {
      setUpdatingId(repair.id);
      setError("");
      const token = localStorage.getItem("token");
      await json(
        await fetch(`${API}/admin/repairs/${repair.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }),
      );
      const changed = { status, updated_at: new Date().toISOString() };
      setRepairs((items) =>
        items.map((item) =>
          item.id === repair.id ? { ...item, ...changed } : item,
        ),
      );
      setSelected((item) =>
        item?.id === repair.id ? { ...item, ...changed } : item,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingId(null);
    }
  };
  const filtered = useMemo(
    () =>
      repairs.filter((repair) => {
        const search =
          `${repair.id} RP-${String(repair.id).padStart(4, "0")} ${repair.room_number || ""} ${repair.tenant_name || repair.username || ""}`.toLowerCase();
        return (
          (filter === "all" || repair.status === filter) &&
          search.includes(query.trim().toLowerCase())
        );
      }),
    [repairs, query, filter],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pending = repairs.filter((item) => item.status === "pending").length;
  const inProgress = repairs.filter(
    (item) => item.status === "in_progress",
  ).length;
  const completed = repairs.filter(
    (item) => item.status === "completed",
  ).length;
  const viewerImages = selected?.images?.map((image) => image.preview) || [];

  return (
    <div className="admin-payment-page admin-repair-page">
      <header className="admin-payment-heading">
        <div className="page" data-p="ad-dashboard">
        <div className="page-head">
          <div className="eyebrow">ระบบงานช่าง</div>

          <h2>จัดการงานแจ้งซ่อม</h2>

          <p>ติดตามรายการแจ้งซ่อม ดูรายละเอียดภาพประกอบ และอัปเดตสถานะให้ผู้พักอาศัย</p>
        </div>
      </div>
      </header>
      {error && <div className="alert alert-error">{error}</div>}
      <section className="admin-payment-summary admin-repair-summary">
        <article>
          <span className="admin-payment-icon blue">
            <Wrench />
          </span>
          <div>
            <small>งานแจ้งซ่อมทั้งหมด</small>
            <strong>{repairs.length}</strong>
            <em>ทุกรายการในระบบ</em>
          </div>
        </article>
        <article>
          <span className="admin-payment-icon amber">
            <Eye />
          </span>
          <div>
            <small>รอรับเรื่อง</small>
            <strong>{pending}</strong>
            <em>รอดำเนินการ</em>
          </div>
        </article>
        <article>
          <span className="admin-payment-icon blue">
            <Wrench />
          </span>
          <div>
            <small>กำลังดำเนินการ</small>
            <strong>{inProgress}</strong>
            <em>อยู่ระหว่างซ่อม</em>
          </div>
        </article>
        <article>
          <span className="admin-payment-icon green">
            <CheckCircle2 />
          </span>
          <div>
            <small>เสร็จสิ้น</small>
            <strong>{completed}</strong>
            <em>ปิดงานแล้ว</em>
          </div>
        </article>
      </section>
      <section className="admin-payment-table-card">
        <div className="admin-payment-tools">
          <label>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อผู้เช่า ห้อง หรือเลขรายการ RP-0001"
            />
          </label>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table className="admin-payment-table admin-repair-table">
            <thead>
              <tr>
                <th>เลขที่ / วันที่</th>
                <th>ห้อง</th>
                <th>ผู้เช่า</th>
                <th>ปัญหา / รายละเอียด</th>
                <th>ความเร่งด่วน</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="admin-payment-empty">
                    กำลังโหลดรายการแจ้งซ่อม...
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((repair) => (
                  <tr key={repair.id}>
                    <td>
                      <b>RP-{String(repair.id).padStart(4, "0")}</b>
                      <small>{formatDate(repair.created_at)}</small>
                    </td>
                    <td>
                      <b>{repair.room_number || "-"}</b>
                    </td>
                    <td>{repair.tenant_name || repair.username || "-"}</td>
                    <td>
                      <b>{repair.category || "-"}</b>
                      <small title={repair.description}>
                        {shortText(repair.description)}
                      </small>
                    </td>
                    <td>
                      <span
                        className={`admin-repair-urgency ${repair.urgency === "เร่งด่วน" ? "urgent" : "normal"}`}
                      >
                        {repair.urgency || "ทั่วไป"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-repair-status ${statusClass(repair.status)}`}
                      >
                        {statusLabel(repair.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="slip-view-button"
                        onClick={() => {
                          setSelected(repair);
                          setViewerIndex(-1);
                        }}
                      >
                        <Eye size={16} /> ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="admin-payment-empty">
                    ไม่พบรายการที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="admin-payment-pagination">
          <span>
            แสดงรายการที่ {filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}
            –{Math.min(safePage * PAGE_SIZE, filtered.length)} จากทั้งหมด{" "}
            {filtered.length} รายการ
          </span>
          <div>
            <button
              disabled={safePage === 1}
              onClick={() => setPage((value) => value - 1)}
              aria-label="หน้าก่อนหน้า"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: pages }, (_, index) => (
              <button
                key={index}
                className={safePage === index + 1 ? "active" : ""}
                onClick={() => setPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}
            <button
              disabled={safePage === pages}
              onClick={() => setPage((value) => value + 1)}
              aria-label="หน้าถัดไป"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </section>
      {selected && (
        <div
          className="admin-slip-modal admin-repair-detail"
          role="dialog"
          aria-modal="true"
        >
          <section>
            <button onClick={() => setSelected(null)} aria-label="ปิด">
              <X />
            </button>
            <h2>
              รายละเอียดงานแจ้งซ่อม RP-{String(selected.id).padStart(4, "0")}
            </h2>
            <p>
              ห้อง {selected.room_number || "-"} · ผู้แจ้ง{" "}
              {selected.tenant_name || selected.username || "-"}
            </p>
            <dl>
              <div>
                <dt>หมวดหมู่ปัญหา</dt>
                <dd>{selected.category || "-"}</dd>
              </div>
              <div>
                <dt>ระดับความเร่งด่วน</dt>
                <dd>
                  <span
                    className={`admin-repair-urgency ${selected.urgency === "เร่งด่วน" ? "urgent" : "normal"}`}
                  >
                    {selected.urgency || "ทั่วไป"}
                  </span>
                </dd>
              </div>
              <div>
                <dt>วันที่แจ้ง</dt>
                <dd>{formatDate(selected.created_at)}</dd>
              </div>
              <div>
                <dt>รายละเอียด</dt>
                <dd>{selected.description || "-"}</dd>
              </div>
            </dl>
            <h3>รูปภาพประกอบ</h3>
            {selected.images?.length ? (
              <div className="repair-admin-images repair-detail-images">
                {selected.images.map((image, index) => (
                  <img
                    key={image.id}
                    src={image.preview}
                    alt={`รูปแจ้งซ่อม ${index + 1}`}
                    onClick={() => setViewerIndex(index)}
                  />
                ))}
              </div>
            ) : (
              <p className="admin-payment-dash">ไม่มีรูปภาพประกอบ</p>
            )}
            <div className="admin-repair-detail-actions">
              <label>
                สถานะงาน
                <select
                  value={selected.status}
                  disabled={updatingId === selected.id}
                  onChange={(event) =>
                    updateStatus(selected, event.target.value)
                  }
                >
                  {statuses
                    .filter((item) => item.value !== "all")
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </label>
              {updatingId === selected.id && <span>กำลังบันทึก...</span>}
            </div>
          </section>
        </div>
      )}
      {selected && viewerImages.length > 0 && (
        <ImageViewer
          images={viewerImages}
          index={viewerIndex}
          setIndex={setViewerIndex}
          close={() => setViewerIndex(-1)}
        />
      )}
    </div>
  );
}
