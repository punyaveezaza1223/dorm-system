import React, { useEffect, useState } from "react";
import {
  BellRing,
  ChevronRight,
  FilePlus2,
  Home,
  LoaderCircle,
  Send,
  Trash2,
} from "lucide-react";

const API_URL = "http://localhost:4000";

export default function Announcement() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ประกาศทั่วไป");
  const [content, setContent] = useState("");

  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 2600);
  };

  // =================================
  // Token
  // =================================

  const getToken = () => {
    return localStorage.getItem("token") || localStorage.getItem("auth_token");
  };

  // =================================
  // ดึงประกาศ
  // =================================

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const token = getToken();

      const response = await fetch(`${API_URL}/api/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "ไม่สามารถโหลดประกาศได้");
      }

      setAnnouncements(result.data || []);
    } catch (error) {
      console.error("Fetch announcements error:", error);
      triggerToast(error.message || "ไม่สามารถโหลดประกาศได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // =================================
  // สร้างประกาศ
  // =================================

  const handlePublish = async () => {
    if (!title.trim()) {
      triggerToast("กรุณากรอกหัวข้อประกาศ");
      return;
    }

    if (!content.trim()) {
      triggerToast("กรุณากรอกรายละเอียดประกาศ");
      return;
    }

    try {
      setPublishing(true);

      const token = getToken();

      const response = await fetch(`${API_URL}/api/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          content: content.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "ไม่สามารถเผยแพร่ประกาศได้");
      }

      // เพิ่มประกาศใหม่ไว้บนสุดทันที
      setAnnouncements((prev) => [result.data, ...prev]);

      // ล้างฟอร์ม
      setTitle("");
      setCategory("ประกาศทั่วไป");
      setContent("");

      triggerToast("เผยแพร่ประกาศเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Publish announcement error:", error);

      triggerToast(error.message || "ไม่สามารถเผยแพร่ประกาศได้");
    } finally {
      setPublishing(false);
    }
  };

  // =================================
  // ลบประกาศ
  // =================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm("คุณต้องการลบประกาศนี้ใช่หรือไม่?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      const token = getToken();

      const response = await fetch(`${API_URL}/api/announcements/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "ไม่สามารถลบประกาศได้");
      }

      setAnnouncements((prev) =>
        prev.filter((announcement) => announcement.id !== id),
      );

      triggerToast("ลบประกาศเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Delete announcement error:", error);

      triggerToast(error.message || "ไม่สามารถลบประกาศได้");
    } finally {
      setDeletingId(null);
    }
  };

  // =================================
  // Format วันที่
  // =================================

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="page announcement-dashboard" data-p="ad-announce">
      <header className="announcement-dashboard__header">
        <div className="announcement-dashboard__title-block">
          <nav
            className="announcement-dashboard__breadcrumb"
            aria-label="ตำแหน่งปัจจุบัน"
          >
            <b>ประกาศข่าวสารและแจ้งเตือนลูกบ้าน</b>
          </nav>
          <h1>ประกาศข่าวสารและแจ้งเตือนลูกบ้าน</h1>
          <p>
            สร้างประกาศ ข่าวสาร
            หรือการแจ้งเตือนสำคัญส่งตรงถึงแอปพลิเคชันของลูกบ้าน
          </p>
        </div>
        <div className="announcement-dashboard__count">
          <BellRing aria-hidden="true" size={21} />
          <span>ประกาศทั้งหมด</span>
          <b>{announcements.length}</b>
        </div>
      </header>

      <div className="announcement-dashboard__layout">
        {/* ================================= */}
        {/* สร้างประกาศ */}
        {/* ================================= */}

        <section className="card announcement-dashboard__composer">
          <div className="announcement-dashboard__section-heading">
            <span className="announcement-dashboard__heading-icon">
              <FilePlus2 aria-hidden="true" size={21} />
            </span>
            <div>
              <h2>สร้างประกาศใหม่</h2>
              <p>เขียนข้อความที่จะส่งให้ผู้พักอาศัย</p>
            </div>
          </div>

          <div className="field">
            <label>หัวข้อประกาศ</label>

            <input
              type="text"
              placeholder="ระบุหัวข้อข่าวสารหรือประกาศ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label>หมวดหมู่</label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>ประกาศทั่วไป</option>

              <option>ค่าใช้จ่าย</option>

              <option>กิจกรรม</option>

              <option>ความปลอดภัย</option>
            </select>
          </div>

          <div className="field">
            <label>รายละเอียด</label>

            <textarea
              rows="4"
              placeholder="กรอกข้อความและรายละเอียดประกาศ..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="announcement-dashboard__publish"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <LoaderCircle
                className="announcement-dashboard__spin"
                size={19}
              />
            ) : (
              <Send size={19} />
            )}
            {publishing ? "กำลังเผยแพร่..." : "เผยแพร่ประกาศ"}
          </button>
        </section>

        {/* ================================= */}
        {/* ประวัติประกาศ */}
        {/* ================================= */}

        <section className="card announcement-dashboard__history">
          <div className="announcement-dashboard__section-heading">
            <span className="announcement-dashboard__heading-icon is-history">
              <BellRing aria-hidden="true" size={21} />
            </span>
            <div>
              <h2>ประวัติประกาศทั้งหมด</h2>
              <p>{announcements.length} รายการในระบบ</p>
            </div>
          </div>

          <div className="announcement-dashboard__list">
            {loading ? (
              <div className="announcement-dashboard__empty">
                <LoaderCircle
                  className="announcement-dashboard__spin"
                  size={22}
                />
                กำลังโหลดประกาศ...
              </div>
            ) : announcements.length === 0 ? (
              <div className="announcement-dashboard__empty">
                ยังไม่มีประกาศ
              </div>
            ) : (
              announcements.map((announcement, index) => (
                <div
                  className="announce-item announcement-dashboard__item"
                  style={{
                    paddingTop: index === 0 ? 0 : undefined,
                  }}
                  key={announcement.id}
                >
                  <div className="row between announcement-dashboard__item-top">
                    <span className="tag-lbl">{announcement.category}</span>

                    <button
                      type="button"
                      className="announcement-dashboard__delete"
                      onClick={() => handleDelete(announcement.id)}
                      disabled={deletingId === announcement.id}
                    >
                      <Trash2 size={15} />
                      {deletingId === announcement.id ? "กำลังลบ..." : "ลบ"}
                    </button>
                  </div>

                  <h4>{announcement.title}</h4>

                  <p>{announcement.content}</p>

                  <div className="date">
                    {formatDate(announcement.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ================================= */}
      {/* Toast */}
      {/* ================================= */}

      <div className={`toast ${showToast ? "show" : ""}`} id="toast">
        <span className="dot"></span>

        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}
