import React, { useEffect, useState } from "react";

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
    return localStorage.getItem("token")
      || localStorage.getItem("auth_token");
  };


  // =================================
  // ดึงประกาศ
  // =================================

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/announcements`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "ไม่สามารถโหลดประกาศได้"
        );
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

      const response = await fetch(
        `${API_URL}/api/announcements`,
        {
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
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "ไม่สามารถเผยแพร่ประกาศได้"
        );
      }

      // เพิ่มประกาศใหม่ไว้บนสุดทันที
      setAnnouncements((prev) => [
        result.data,
        ...prev,
      ]);

      // ล้างฟอร์ม
      setTitle("");
      setCategory("ประกาศทั่วไป");
      setContent("");

      triggerToast("เผยแพร่ประกาศเรียบร้อยแล้ว");

    } catch (error) {
      console.error("Publish announcement error:", error);

      triggerToast(
        error.message || "ไม่สามารถเผยแพร่ประกาศได้"
      );

    } finally {
      setPublishing(false);
    }
  };


  // =================================
  // ลบประกาศ
  // =================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "คุณต้องการลบประกาศนี้ใช่หรือไม่?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/announcements/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "ไม่สามารถลบประกาศได้"
        );
      }

      setAnnouncements((prev) =>
        prev.filter(
          (announcement) => announcement.id !== id
        )
      );

      triggerToast("ลบประกาศเรียบร้อยแล้ว");

    } catch (error) {
      console.error("Delete announcement error:", error);

      triggerToast(
        error.message || "ไม่สามารถลบประกาศได้"
      );

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

    return new Date(date).toLocaleDateString(
      "th-TH",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };


  return (
    <div className="page" data-p="ad-announce">

      <div className="page-head">
        <div className="eyebrow">
          จัดการประกาศ
        </div>

        <h2>
          ประกาศข่าวสารและแจ้งเตือนลูกบ้าน
        </h2>

        <p>
          สร้างประกาศ ข่าวสาร หรือการแจ้งเตือนสำคัญ
          ส่งตรงถึงแอปพลิเคชันของลูกบ้าน
        </p>
      </div>


      <div className="two-col">

        {/* ================================= */}
        {/* สร้างประกาศ */}
        {/* ================================= */}

        <div className="card card-pad">

          <h4
            style={{
              marginBottom: "16px",
              fontSize: "15px",
            }}
          >
            สร้างประกาศใหม่
          </h4>


          <div className="field">
            <label>
              หัวข้อประกาศ
            </label>

            <input
              type="text"
              placeholder="ระบุหัวข้อข่าวสารหรือประกาศ"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
            />
          </div>


          <div className="field">
            <label>
              หมวดหมู่
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >
              <option>
                ประกาศทั่วไป
              </option>

              <option>
                ค่าใช้จ่าย
              </option>

              <option>
                กิจกรรม
              </option>

              <option>
                ความปลอดภัย
              </option>
            </select>
          </div>


          <div className="field">
            <label>
              รายละเอียด
            </label>

            <textarea
              rows="4"
              placeholder="กรอกข้อความและรายละเอียดประกาศ..."
              value={content}
              onChange={(e) =>
                setContent(e.target.value)
              }
            />
          </div>


          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing
              ? "กำลังเผยแพร่..."
              : "เผยแพร่ประกาศ"}
          </button>

        </div>


        {/* ================================= */}
        {/* ประวัติประกาศ */}
        {/* ================================= */}

        <div className="card card-pad">

          <h4
            style={{
              marginBottom: "14px",
              fontSize: "15px",
            }}
          >
            ประวัติประกาศทั้งหมด
          </h4>


          <div className="col gap-16">

            {loading ? (
              <div>
                กำลังโหลดประกาศ...
              </div>
            ) : announcements.length === 0 ? (

              <div>
                ยังไม่มีประกาศ
              </div>

            ) : (

              announcements.map(
                (announcement, index) => (

                  <div
                    className="announce-item"
                    style={{
                      paddingTop:
                        index === 0
                          ? 0
                          : undefined,
                    }}
                    key={announcement.id}
                  >

                    <div className="row between">

                      <span className="tag-lbl">
                        {announcement.category}
                      </span>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: "var(--red)",
                        }}
                        onClick={() =>
                          handleDelete(
                            announcement.id
                          )
                        }
                        disabled={
                          deletingId ===
                          announcement.id
                        }
                      >
                        {deletingId ===
                        announcement.id
                          ? "กำลังลบ..."
                          : "ลบ"}
                      </button>

                    </div>


                    <h4>
                      {announcement.title}
                    </h4>


                    <p>
                      {announcement.content}
                    </p>


                    <div className="date">
                      {formatDate(
                        announcement.created_at
                      )}
                    </div>

                  </div>

                )
              )

            )}

          </div>

        </div>

      </div>


      {/* ================================= */}
      {/* Toast */}
      {/* ================================= */}

      <div
        className={`toast ${
          showToast ? "show" : ""
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