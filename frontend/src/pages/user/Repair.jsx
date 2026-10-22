import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react';
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
  const [images, setImages] = useState([]);
  const [viewer, setViewer] = useState(null);

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

      const withImages = await Promise.all((data.data || []).map(async (repair) => ({ ...repair, images: (await Promise.all((repair.images || []).map(async (image) => { const imageResponse = await fetch(`${API_URL}${image.url}`, { headers: { Authorization: `Bearer ${token}` } }); return imageResponse.ok ? { ...image, preview: URL.createObjectURL(await imageResponse.blob()) } : null; }))).filter(Boolean) })));
      setRepairs(withImages);
    } catch (error) {
      console.error('Fetch Repairs Error:', error);
      triggerToast('ไม่สามารถโหลดประวัติการแจ้งซ่อมได้');
    }
  };

  // โหลดประวัติเมื่อเปิดหน้า
  useEffect(() => {
    fetchRepairs();
  }, []);

  const addImages = (fileList) => {
    const files = Array.from(fileList || []);
    const accepted = files.filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (accepted.length !== files.length) triggerToast('รองรับ JPG, JPEG, PNG, WEBP ขนาดไม่เกิน 5 MB เท่านั้น');
    setImages((current) => {
      const remaining = 5 - current.length;
      if (accepted.length > remaining) triggerToast('แนบรูปได้สูงสุด 5 รูป');
      return [...current, ...accepted.slice(0, remaining).map((file) => ({ file, preview: URL.createObjectURL(file) }))];
    });
  };
  const removeImage = (index) => setImages((current) => { URL.revokeObjectURL(current[index].preview); return current.filter((_, itemIndex) => itemIndex !== index); });

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

      const formData = new FormData();
      formData.append('category', category); formData.append('description', description); formData.append('urgency', urgency);
      images.forEach((image) => formData.append('images', image.file));
      const response = await fetch(`${API_URL}/api/tenant/repairs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
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
      images.forEach((image) => URL.revokeObjectURL(image.preview));
      setImages([]);

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

  const latestRepair = repairs[0] || null;

  const getRepairProgress = (status) => {
    if (status === 'completed') return 4;
    if (status === 'in_progress') return 3;
    return 1;
  };

  const getLatestStatusText = (status) => {
    if (status === 'pending') return 'รอรับเรื่อง';
    if (status === 'in_progress') return 'กำลังซ่อม';
    if (status === 'completed') return 'เสร็จสิ้น';
    if (status === 'cancelled') return 'ยกเลิก';
    return getStatusText(status);
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

        <div className="card card-pad repair-form-card">

          <h4 className="repair-form-heading">
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
              placeholder="เลือกหมวดหมู่ปัญหา"
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

            <label className="upload-box repair-image-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addImages(event.dataTransfer.files); }}>
              <ImagePlus size={22} strokeWidth={2} />
              ลากรูปมาวาง หรือ <b style={{ color: 'var(--brass-deep)' }}>เลือกไฟล์</b>
              <small>JPG, JPEG, PNG, WEBP · ไม่เกิน 5 MB/รูป · สูงสุด 5 รูป ({images.length}/5)</small>
              <input type="file" accept="image/*" multiple onChange={(event) => { addImages(event.target.files); event.target.value = ''; }} />
            </label>
            {images.length > 0 && <div className="repair-image-preview">{images.map((image, index) => <div key={image.preview}><img src={image.preview} alt={`ภาพตัวอย่าง ${index + 1}`} onClick={() => setViewer({ images: images.map((item) => item.preview), index })} /><button type="button" onClick={() => removeImage(index)} aria-label="ลบรูป"><X size={14} /></button></div>)}</div>}

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

        <div className="repair-history-column">
        <div id="repair-history" className="card card-pad repair-history-card">

          <h4 className="repair-history-heading">
            ประวัติการแจ้งซ่อม
          </h4>

          <div className="repair-history-list">

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

                <article className="repair-history-item" key={repair.id}>

                  <div className="repair-history-copy">

                    <span className="repair-history-id">#{String(repair.id).padStart(4, '0')}</span>
                    <b className="repair-history-title">{repair.category}</b>

                    <div
                      className="repair-history-description"
                    >
                      {repair.description}
                    </div>

                    <div
                      className="repair-history-date"
                    >
                      แจ้ง {formatDate(repair.created_at)}
                    </div>
                    {repair.images?.length > 0 && <div className="repair-history-images">{repair.images.map((image, index) => <img key={image.id} src={image.preview} alt={`รูปแจ้งซ่อม ${index + 1}`} onClick={() => setViewer({ images: repair.images.map((item) => item.preview), index })} />)}</div>}

                  </div>

                  <span className={`badge repair-history-status ${getStatusClass(repair.status)}`}>
                    {getStatusText(repair.status)}
                  </span>

                </article>

              ))

            )}

          </div>

        </div>
        </div>

        <aside className="repair-emergency-card" aria-labelledby="repair-emergency-title">
          <h3 id="repair-emergency-title">ต้องการความช่วยเหลือด่วน?</h3>
          <p>หากมีเหตุฉุกเฉิน เช่น ไฟไหม้ หรือน้ำท่วมใหญ่ โปรดติดต่อเจ้าหน้าที่ทันที</p>
          <a href="tel:021234567" aria-label="โทรหาเจ้าหน้าที่ที่หมายเลข 02-123-4567">
            <span aria-hidden="true">☎</span> 02-123-4567
          </a>
        </aside>

      </div>

      <section className="tenant-repair-status-card">
        <div className="tenant-repair-status-head">
          <h3>สถานะงานแจ้งซ่อมล่าสุด</h3>
          {latestRepair && (
            <span className={`badge ${getStatusClass(latestRepair.status)}`}>
              <i />{getLatestStatusText(latestRepair.status)}
            </span>
          )}
        </div>

        {latestRepair ? (
          <>
            <p className="tenant-repair-status-detail">
              #{latestRepair.id} · {latestRepair.category || 'แจ้งซ่อม'} · แจ้งเมื่อ {formatDate(latestRepair.created_at)}
            </p>

            <div className="tenant-repair-progress" aria-label="ความคืบหน้างานแจ้งซ่อม">
              {[
                ['แจ้งซ่อม', 1],
                ['รับเรื่อง', 2],
                ['กำลังซ่อม', 3],
                ['เสร็จสิ้น', 4],
              ].map(([label, step]) => {
                const currentStep = getRepairProgress(latestRepair.status);
                const completed =
                  step < currentStep ||
                  (step === 1 && currentStep === 1) ||
                  (step === currentStep && latestRepair.status === 'completed');
                const active = step === currentStep && latestRepair.status !== 'completed';

                return (
                  <div className="tenant-repair-progress-step" key={step}>
                    <span className={completed ? 'done' : active ? 'active' : ''}>
                      {completed ? '✓' : step}
                    </span>
                    <b>{label}</b>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="tenant-repair-detail-button"
              onClick={() => document.getElementById('repair-history')?.scrollIntoView({ behavior: 'smooth' })}
            >
              ดูรายละเอียดทั้งหมด
            </button>
          </>
        ) : (
          <p className="tenant-repair-empty">ยังไม่มีรายการแจ้งซ่อม</p>
        )}
      </section>

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
      {viewer && <div className="repair-image-viewer" role="dialog" aria-modal="true" aria-label="ภาพแจ้งซ่อมขยาย" onClick={() => setViewer(null)}>
        <button className="repair-viewer-close" type="button" onClick={() => setViewer(null)} aria-label="ปิดภาพ"><X /></button>
        {viewer.images.length > 1 && <button className="repair-viewer-prev" type="button" aria-label="รูปก่อนหน้า" onClick={(event) => { event.stopPropagation(); setViewer((current) => ({ ...current, index: (current.index - 1 + current.images.length) % current.images.length })); }}><ChevronLeft /></button>}
        <img src={viewer.images[viewer.index]} alt="ภาพแจ้งซ่อมขยาย" onClick={(event) => event.stopPropagation()} />
        {viewer.images.length > 1 && <button className="repair-viewer-next" type="button" aria-label="รูปถัดไป" onClick={(event) => { event.stopPropagation(); setViewer((current) => ({ ...current, index: (current.index + 1) % current.images.length })); }}><ChevronRight /></button>}
      </div>}

    </div>
  );
}
