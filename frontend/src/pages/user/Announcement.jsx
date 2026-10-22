import React, { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

const API_URL = "http://localhost:4000";

export default function Announcement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  const getToken = () => {
    return localStorage.getItem("token")
      || localStorage.getItem("auth_token");
  };


  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError("");

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
          result.message ||
          "ไม่สามารถโหลดประกาศได้"
        );
      }

      setAnnouncements(result.data || []);

    } catch (err) {
      console.error(
        "Fetch announcements error:",
        err
      );

      setError(
        err.message ||
        "ไม่สามารถโหลดประกาศได้"
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchAnnouncements();
  }, []);


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
    <div
      className="page"
      data-p="res-announce"
    >

      <div className="page-head">

        <div className="eyebrow">
          ข่าวสาร
        </div>

        <h2>
          ประกาศจากผู้ดูแล
        </h2>

        <p>
          ติดตามประกาศและข่าวสารทั้งหมด
          จากนิติบุคคล/ผู้ดูแลอาคาร
        </p>

      </div>


      <div className="card card-pad announcement-list-card">

        {loading && (
          <div className="announcement-state">
            กำลังโหลดประกาศ...
          </div>
        )}


        {!loading && error && (
          <div className="announcement-state is-error">
            {error}
          </div>
        )}


        {!loading &&
          !error &&
          announcements.length === 0 && (

            <div className="announcement-state">
              ขณะนี้ยังไม่มีประกาศ
            </div>

          )}


        {!loading &&
          !error &&
          announcements.map(
            (announcement) => (

              <article
                className="announce-item"
                key={announcement.id}
              >

                <div className="announce-item-copy">
                <div className="tag-lbl">
                  {announcement.category}
                </div>


                <h4>
                  {announcement.title}
                </h4>


                <p>
                  {announcement.content}
                </p>

                </div>


                <time className="date">
                  <CalendarDays size={14} />
                  {formatDate(
                    announcement.created_at
                  )}
                </time>

              </article>

            )
          )}

      </div>

    </div>
  );
}
