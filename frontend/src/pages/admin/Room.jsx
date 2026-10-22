import React, { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Home,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

const API_URL = "http://localhost:4000/api";

function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const values = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...values]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
  const items = [];
  let previous = 0;

  sorted.forEach((value) => {
    if (previous && value - previous > 1) items.push(`gap-${previous}`);
    items.push(value);
    previous = value;
  });

  return items;
}

export default function Room() {
  // =================================
  // State
  // =================================

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  // =================================
  // Room Form
  // =================================

  const [roomForm, setRoomForm] = useState({
    roomNumber: "",
    floor: "",
    type: "studio",
    size: "",
    monthlyRent: "",
    roomStatus: "available",
    tenantName: "",
  });

  // =================================
  // Contract Form
  // =================================

  const [contractForm, setContractForm] = useState({
    tenantId: "",
    monthlyRent: "",
    startDate: "",
    endDate: "",
  });

  // =================================
  // Tenant Search
  // =================================

  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(false);

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
  // ดึงข้อมูลห้อง
  // =================================

  const fetchRooms = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/rooms`);

      if (!response.ok) {
        throw new Error("ไม่สามารถเชื่อมต่อ Backend ได้");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "ไม่สามารถดึงข้อมูลห้องได้");
      }

      setRooms(data.data || []);
    } catch (error) {
      console.error("Fetch Rooms Error:", error);
      triggerToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  // =================================
  // โหลดครั้งแรก
  // =================================

  useEffect(() => {
    fetchRooms();
  }, []);

  // =================================
  // แปลงสถานะ
  // =================================

  const getStatusText = (status) => {
    switch (status) {
      case "available":
      case "empty":
      case "ว่าง":
        return "ว่าง";

      case "occupied":
      case "มีผู้พัก":
        return "มีผู้พัก";

      case "maintenance":
      case "repair":
      case "แจ้งซ่อม":
        return "แจ้งซ่อม";

      case "due":
      case "ค้างชำระ":
        return "ค้างชำระ";

      default:
        return status || "ไม่ระบุ";
    }
  };

  // =================================
  // Class ของ Badge
  // =================================

  const getStatusBadge = (status) => {
    const text = getStatusText(status);

    switch (text) {
      case "ว่าง":
        return "b-green";

      case "มีผู้พัก":
        return "b-amber";

      case "แจ้งซ่อม":
        return "b-rust";

      case "ค้างชำระ":
        return "b-red";

      default:
        return "b-gray";
    }
  };

  // =================================
  // เปิดเพิ่มห้อง
  // =================================

  const openAddRoom = () => {
    setSelectedRoom(null);

    setRoomForm({
      roomNumber: "",
      floor: "",
      type: "studio",
      size: "",
      monthlyRent: "",
      roomStatus: "available",
      tenantName: "",
      description: "",
    });

    setModalType("add");
    setShowModal(true);
  };

  // =================================
  // เปิดแก้ไขห้อง
  // =================================

  const openEditRoom = (room) => {
    setSelectedRoom(room);

    setRoomForm({
      roomNumber: room.roomNumber || room.room_number || "",

      floor: room.floor || "",

      type: room.type || "studio",

      size: room.size || "",

      monthlyRent: room.rent ?? room.monthlyRent ?? room.monthly_rent ?? "",

      roomStatus:
        room.roomStatus || room.room_status || room.status || "available",

      tenantName: room.tenantName ?? room.tenant_name ?? room.tenant ?? "",

      description: room.description ?? "",
    });

    setModalType("edit");
    setShowModal(true);
  };
  // =================================
  // เปิดทำสัญญา
  // =================================

  const openContract = (room) => {
    setSelectedRoom(room);

    setTenantInfo(null);

    setContractForm({
      tenantId: "",
      monthlyRent: room.rent ?? room.monthlyRent ?? room.monthly_rent ?? "",
      startDate: "",
      endDate: "",
    });

    setModalType("contract");
    setShowModal(true);
  };

  // =================================
  // ปิด Modal
  // =================================

  const closeModal = () => {
    setShowModal(false);
    setSelectedRoom(null);
    setModalType("");
    setTenantInfo(null);
    setTenantLoading(false);
  };

  // =================================
  // บันทึก เพิ่ม / แก้ไขห้อง
  // =================================

  const saveRoom = async (e) => {
    e.preventDefault();

    try {
      const isEdit = modalType === "edit";

      const url = isEdit
        ? `${API_URL}/rooms/${selectedRoom.id}`
        : `${API_URL}/rooms`;

      const method = isEdit ? "PUT" : "POST";

      // ==========================================
      // ถ้าลบชื่อผู้เช่าออก
      // ให้ส่ง null ไป Backend
      // ==========================================

      const isAvailable = isEdit && roomForm.roomStatus === "available";

      const tenantName = isAvailable
        ? null
        : roomForm.tenantName?.trim() || null;

      const roomStatus = roomForm.roomStatus;

      const payload = {
        roomNumber: roomForm.roomNumber,
        floor: roomForm.floor,
        type: roomForm.type,
        size: roomForm.size,
        monthlyRent: roomForm.monthlyRent,
        roomStatus: roomStatus,

        // สำคัญ
        tenantName: tenantName,

        // description
        description: roomForm.description,
      };

      console.log("ส่งข้อมูลแก้ไขห้อง:", payload);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("ผลจาก Backend:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "ไม่สามารถบันทึกข้อมูลห้องได้");
      }

      closeModal();

      await fetchRooms();

      triggerToast(
        isEdit ? "แก้ไขข้อมูลห้องเรียบร้อย" : "เพิ่มห้องพักใหม่เรียบร้อย",
      );
    } catch (error) {
      console.error("Save Room Error:", error);

      triggerToast(error.message);
    }
  };

  const deleteRoom = async () => {
    if (!selectedRoom) return;

    const roomNumber =
      selectedRoom.roomNumber || selectedRoom.room_number || "นี้";

    const confirmed = window.confirm(
      `ยืนยันการลบห้อง ${roomNumber}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/rooms/${selectedRoom.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "ไม่สามารถลบห้องได้");
      }

      closeModal();
      await fetchRooms();
      triggerToast("ลบห้องเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Delete Room Error:", error);
      triggerToast(error.message);
    }
  };

  // =================================
  // ค้นหาผู้เช่าจาก ID
  // =================================

  const findTenant = async () => {
    if (!contractForm.tenantId) {
      triggerToast("กรุณากรอก ID ผู้เช่า");
      return;
    }

    try {
      setTenantLoading(true);
      setTenantInfo(null);

      const response = await fetch(
        `${API_URL}/users/tenant/${contractForm.tenantId}`,
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "ไม่พบข้อมูลผู้เช่า");
      }

      setTenantInfo(data.data);

      triggerToast("พบข้อมูลผู้เช่าแล้ว");
    } catch (error) {
      console.error("Find Tenant Error:", error);

      setTenantInfo(null);

      triggerToast(error.message);
    } finally {
      setTenantLoading(false);
    }
  };

  // =================================
  // ทำสัญญา
  // =================================

  const saveContract = async (e) => {
    e.preventDefault();

    if (!tenantInfo) {
      triggerToast("กรุณาค้นหาและยืนยันผู้เช่าก่อน");

      return;
    }

    try {
      const response = await fetch(`${API_URL}/contracts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          tenantId: contractForm.tenantId,
          monthlyRent: contractForm.monthlyRent,
          startDate: contractForm.startDate,
          endDate: contractForm.endDate,

          tenantName:
            tenantInfo.name ||
            tenantInfo.full_name ||
            tenantInfo.tenantName ||
            "",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "ไม่สามารถทำสัญญาได้");
      }

      closeModal();

      await fetchRooms();

      triggerToast("ทำสัญญาเช่าเรียบร้อย");
    } catch (error) {
      console.error("Save Contract Error:", error);

      triggerToast(error.message);
    }
  };

  // =================================
  // แจ้งเตือนลูกบ้าน
  // =================================

  const notifyTenant = async (room) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${room.id}/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "ไม่สามารถแจ้งเตือนได้");
      }

      triggerToast(data.message || "ส่งการแจ้งเตือนเรียบร้อย");
    } catch (error) {
      console.error("Notify Tenant Error:", error);

      triggerToast(error.message);
    }
  };

  // =================================
  // กรองข้อมูล
  // =================================

  const filteredRooms = rooms.filter((room) => {
    const roomNumber = room.roomNumber || room.room_number || "";

    const tenantName = room.tenantName || room.tenant_name || room.tenant || "";

    const status = getStatusText(
      room.roomStatus || room.room_status || room.status,
    );

    const searchText = search.toLowerCase();

    const matchSearch =
      roomNumber.toLowerCase().includes(searchText) ||
      tenantName.toLowerCase().includes(searchText);

    let matchStatus = true;

    if (statusFilter === "empty") {
      matchStatus = status === "ว่าง";
    }

    if (statusFilter === "occupied") {
      matchStatus = status === "มีผู้พัก";
    }

    if (statusFilter === "repair") {
      matchStatus = status === "แจ้งซ่อม";
    }

    if (statusFilter === "due") {
      matchStatus = status === "ค้างชำระ";
    }

    return matchSearch && matchStatus;
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const shownRooms = filteredRooms.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const firstRoom = filteredRooms.length ? (activePage - 1) * pageSize + 1 : 0;
  const lastRoom = Math.min(activePage * pageSize, filteredRooms.length);

  const roomSummary = rooms.reduce(
    (summary, room) => {
      const status = getStatusText(
        room.roomStatus || room.room_status || room.status,
      );
      summary.total += 1;
      if (status === "ว่าง") summary.available += 1;
      if (status === "มีผู้พัก") summary.occupied += 1;
      if (status === "แจ้งซ่อม") summary.maintenance += 1;
      return summary;
    },
    { total: 0, available: 0, occupied: 0, maintenance: 0 },
  );

  // =================================
  // Render
  // =================================

  return (
    <div className="page room-dashboard" data-p="ad-room">
      {/* ==============================
          Header
      ============================== */}

      <header className="room-dashboard__header">
        <div className="room-dashboard__title-block">
          <nav
            className="room-dashboard__breadcrumb"
            aria-label="ตำแหน่งปัจจุบัน"
          >
            <Home aria-hidden="true" size={15} />
            <span>จัดการหอพัก</span>
            <ChevronRight aria-hidden="true" size={15} />
            <b>ข้อมูลห้องพักและสัญญาเช่า</b>
          </nav>
          <h1>ข้อมูลห้องพักและสัญญาเช่า</h1>
          <p>
            จัดการสัญญาเช่า เพิ่ม/แก้ไขข้อมูลผู้เช่า และบันทึกประวัติการเข้าพัก
          </p>
        </div>
        <button
          type="button"
          className="room-dashboard__add-button"
          onClick={openAddRoom}
        >
          <Plus size={19} />
          เพิ่มห้องพักใหม่
        </button>
      </header>

      <section
        className="room-dashboard__summary"
        aria-label="สรุปสถานะห้องพัก"
      >
        <article className="is-total">
          <Building2 aria-hidden="true" size={23} />
          <div>
            <span>ห้องพักทั้งหมด</span>
            <b>{roomSummary.total} ห้อง</b>
          </div>
        </article>
        <article className="is-available">
          <Home aria-hidden="true" size={23} />
          <div>
            <span>ห้องว่าง</span>
            <b>{roomSummary.available} ห้อง</b>
          </div>
        </article>
        <article className="is-occupied">
          <UserRound aria-hidden="true" size={23} />
          <div>
            <span>มีผู้พักอาศัย</span>
            <b>{roomSummary.occupied} ห้อง</b>
          </div>
        </article>
        <article className="is-maintenance">
          <FileSignature aria-hidden="true" size={23} />
          <div>
            <span>แจ้งซ่อม</span>
            <b>{roomSummary.maintenance} ห้อง</b>
          </div>
        </article>
      </section>

      {/* ==============================
          Search / Filter
      ============================== */}

      <section className="card room-dashboard__filters">
        <div className="room-dashboard__section-heading">
          <span className="room-dashboard__heading-icon">
            <Search aria-hidden="true" size={21} />
          </span>
          <div>
            <h2>รายการห้องพัก</h2>
            <p>ค้นหาและกรองข้อมูลห้องพักตามสถานะที่ต้องการ</p>
          </div>
        </div>

        <div className="room-dashboard__filter-controls">
          <div className="field room-dashboard__search">
            <label>ค้นหาตามเลขห้องหรือชื่อ</label>
            <div>
              <Search aria-hidden="true" size={18} />
              <input
                type="text"
                placeholder="เช่น A102, ณัฐชา"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="field room-dashboard__status-filter">
            <label>สถานะห้อง</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">ทั้งหมด</option>

              <option value="empty">ว่าง</option>

              <option value="occupied">มีผู้พัก</option>

              <option value="repair">แจ้งซ่อม</option>

              <option value="due">ค้างชำระ</option>
            </select>
          </div>
        </div>
      </section>

      {/* ==============================
          Table
      ============================== */}

      <section className="card room-dashboard__table-card">
        <div className="room-dashboard__table-meta">
          <span>
            พบ <b>{filteredRooms.length}</b> ห้อง
          </span>
          <span>แสดงข้อมูลห้องพักทั้งหมด</span>
        </div>
        <div className="table-wrap room-dashboard__table-wrap">
          <table className="room-dashboard__table">
            <thead>
              <tr>
                <th>เลขห้อง</th>

                <th>ชั้น</th>

                <th>ผู้เช่าปัจจุบัน</th>

                <th>เบอร์โทรศัพท์</th>

                <th>ค่าเช่า/เดือน</th>

                <th>สถานะ</th>

                <th>การจัดการ</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="room-dashboard__empty">
                    <LoaderCircle className="room-dashboard__spin" size={22} />
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan="7" className="room-dashboard__empty">
                    ไม่พบข้อมูลห้องพัก
                  </td>
                </tr>
              ) : (
                shownRooms.map((room) => {
                  const roomNumber = room.roomNumber || room.room_number || "-";

                  const floor = room.floor || "-";

                  const tenantName =
                    room.tenantName || room.tenant_name || room.tenant || "—";

                  const phone =
                    room.phone || room.tenantPhone || room.tenant_phone || "—";

                  const rent =
                    room.rent ?? room.monthlyRent ?? room.monthly_rent ?? 0;

                  const rawStatus =
                    room.roomStatus ||
                    room.room_status ||
                    room.status ||
                    "available";

                  const status = getStatusText(rawStatus);

                  return (
                    <tr key={room.id}>
                      <td
                        className="mono"
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {roomNumber}
                      </td>

                      <td>ชั้น {floor}</td>

                      <td>{tenantName}</td>

                      <td className="mono">{phone}</td>

                      <td className="mono">
                        ฿{Number(rent).toLocaleString("th-TH")}
                      </td>

                      <td>
                        <span className={`badge ${getStatusBadge(rawStatus)}`}>
                          {status}
                        </span>
                      </td>

                      <td>
                        <div className="rowbtns">
                          {/* แก้ไข */}
                          <button
                            type="button"
                            className="room-dashboard__action-button"
                            onClick={() => openEditRoom(room)}
                          >
                            <Pencil size={15} />
                            แก้ไข
                          </button>

                          {/* ทำสัญญา */}
                          {status === "ว่าง" && (
                            <button
                              type="button"
                              className="room-dashboard__action-button is-contract"
                              onClick={() => openContract(room)}
                            >
                              <FileSignature size={15} />
                              ทำสัญญา
                            </button>
                          )}

                          {/* แจ้งเตือน */}
                          {status === "ค้างชำระ" && (
                            <button
                              type="button"
                              className="room-dashboard__action-button"
                              onClick={() => notifyTenant(room)}
                            >
                              <Bell size={15} />
                              แจ้งเตือน
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredRooms.length > 0 && (
          <footer className="room-dashboard__pagination">
            <label>
              แสดง
              <select
                aria-label="จำนวนห้องต่อหน้า"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {[5, 10, 20].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              รายการต่อหน้า
            </label>
            <span>
              แสดง {firstRoom}–{lastRoom} จาก {filteredRooms.length} ห้อง
            </span>
            <nav aria-label="เปลี่ยนหน้ารายการห้องพัก">
              <button
                type="button"
                aria-label="หน้าก่อนหน้า"
                disabled={activePage === 1}
                onClick={() => setPage(activePage - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              {pageItems(activePage, totalPages).map((item) =>
                typeof item === "string" ? (
                  <span key={item}>…</span>
                ) : (
                  <button
                    type="button"
                    key={item}
                    className={item === activePage ? "is-active" : ""}
                    aria-current={item === activePage ? "page" : undefined}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                aria-label="หน้าถัดไป"
                disabled={activePage === totalPages}
                onClick={() => setPage(activePage + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          </footer>
        )}
      </section>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {/* =================================================
                เพิ่ม / แก้ไขห้อง
            ================================================= */}

            {(modalType === "add" || modalType === "edit") && (
              <form onSubmit={saveRoom}>
                <h3>
                  {modalType === "add"
                    ? "เพิ่มห้องพักใหม่"
                    : `แก้ไขห้อง ${
                        selectedRoom?.roomNumber ||
                        selectedRoom?.room_number ||
                        ""
                      }`}
                </h3>

                <div
                  className="col gap-12"
                  style={{
                    fontSize: "13.8px",
                  }}
                >
                  {/* เลขห้อง */}

                  <div className="field">
                    <label>เลขห้อง</label>

                    <input
                      type="text"
                      value={roomForm.roomNumber}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          roomNumber: e.target.value,
                        })
                      }
                      placeholder="เช่น A101"
                      required
                    />
                  </div>

                  {/* ชั้น */}

                  <div className="field">
                    <label>ชั้น</label>

                    <select
                      value={roomForm.floor}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          floor: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">เลือกชั้น</option>

                      <option value="1">ชั้น 1</option>

                      <option value="2">ชั้น 2</option>

                      <option value="3">ชั้น 3</option>
                    </select>
                  </div>

                  {/* ประเภท */}

                  <div className="field">
                    <label>ประเภทห้อง</label>

                    <select
                      value={roomForm.type}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="studio">Studio</option>

                      <option value="1-bedroom">1 Bedroom</option>
                      <option value="1bed">1 Bedroom (existing)</option>
                      <option value="2bed">2 Bedroom (existing)</option>
                    </select>
                  </div>

                  {/* ขนาด */}

                  <div className="field">
                    <label>ขนาดห้อง (ตร.ม.)</label>

                    <input
                      type="number"
                      value={roomForm.size}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          size: e.target.value,
                        })
                      }
                      placeholder="เช่น 30"
                    />
                  </div>

                  {/* ค่าเช่า */}

                  <div className="field">
                    <label>ค่าเช่า/เดือน</label>

                    <input
                      type="number"
                      value={roomForm.monthlyRent}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          monthlyRent: e.target.value,
                        })
                      }
                      placeholder="เช่น 6500"
                      required
                    />
                  </div>

                  {/* Description */}

                  <div className="field">
                    <label>รายละเอียดห้อง</label>

                    <textarea
                      value={roomForm.description}
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="เช่น ห้องมุม มีระเบียง วิวสวน"
                      rows="3"
                    />
                  </div>

                  {/* ชื่อผู้เช่า */}

                  {modalType === "edit" && (
                    <div className="field">
                      <label>ชื่อผู้เช่าปัจจุบัน</label>

                      <input
                        type="text"
                        value={roomForm.tenantName}
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            tenantName: e.target.value,
                          })
                        }
                        placeholder="เช่น นายสมชาย ใจดี"
                      />
                    </div>
                  )}

                  {/* สถานะ */}

                  {modalType === "edit" && (
                    <div className="field">
                      <label>สถานะห้อง</label>

                      <select
                        value={roomForm.roomStatus}
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            roomStatus: e.target.value,
                            tenantName:
                              e.target.value === "available"
                                ? ""
                                : roomForm.tenantName,
                          })
                        }
                      >
                        <option value="available">ว่าง</option>

                        <option value="occupied">มีผู้พัก</option>

                        <option value="maintenance">แจ้งซ่อม</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-foot">
                  {modalType === "edit" && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={deleteRoom}
                      style={{
                        marginRight: "auto",
                        background: "#c0433f",
                        borderColor: "#c0433f",
                        color: "#fff",
                      }}
                    >
                      ลบห้อง
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={closeModal}
                  >
                    ยกเลิก
                  </button>

                  <button type="submit" className="btn btn-primary btn-sm">
                    บันทึก
                  </button>
                </div>
              </form>
            )}

            {/* =================================================
                ทำสัญญา
            ================================================= */}

            {modalType === "contract" && (
              <form onSubmit={saveContract}>
                <h3>
                  ทำสัญญาเช่า ห้อง{" "}
                  {selectedRoom?.roomNumber || selectedRoom?.room_number || ""}
                </h3>

                <div
                  className="col gap-12"
                  style={{
                    fontSize: "13.8px",
                  }}
                >
                  {/* ID ผู้เช่า */}

                  <div className="field">
                    <label>ID ผู้เช่า</label>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="number"
                        value={contractForm.tenantId}
                        onChange={(e) => {
                          setContractForm({
                            ...contractForm,
                            tenantId: e.target.value,
                          });

                          setTenantInfo(null);
                        }}
                        placeholder="กรอก ID ผู้เช่า"
                        required
                        style={{
                          flex: 1,
                        }}
                      />

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={findTenant}
                        disabled={tenantLoading}
                        style={{
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tenantLoading ? "กำลังค้นหา..." : "ค้นหา"}
                      </button>
                    </div>
                  </div>

                  {/* ข้อมูลผู้เช่า */}

                  {tenantInfo && (
                    <div
                      className="card"
                      style={{
                        padding: "14px",
                        background: "var(--sage-bg)",
                        borderColor: "var(--sage)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-dim)",
                          marginBottom: "4px",
                        }}
                      >
                        ผู้เช่าที่พบ
                      </div>

                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--ink)",
                        }}
                      >
                        {tenantInfo.name ||
                          tenantInfo.full_name ||
                          tenantInfo.tenantName ||
                          "-"}
                      </div>

                      {(tenantInfo.phone || tenantInfo.phone_number) && (
                        <div
                          className="mono"
                          style={{
                            fontSize: "12px",
                            color: "var(--text-dim)",
                            marginTop: "3px",
                          }}
                        >
                          {tenantInfo.phone || tenantInfo.phone_number}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ค่าเช่า */}

                  <div className="field">
                    <label>ค่าเช่า/เดือน</label>

                    <input
                      type="number"
                      value={contractForm.monthlyRent}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          monthlyRent: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* วันที่เริ่ม */}

                  <div className="field">
                    <label>วันที่เริ่มสัญญา</label>

                    <input
                      type="date"
                      value={contractForm.startDate}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          startDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* วันที่สิ้นสุด */}

                  <div className="field">
                    <label>วันที่สิ้นสุดสัญญา</label>

                    <input
                      type="date"
                      value={contractForm.endDate}
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-foot">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={closeModal}
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={!tenantInfo}
                    style={{
                      opacity: !tenantInfo ? 0.5 : 1,
                      cursor: !tenantInfo ? "not-allowed" : "pointer",
                    }}
                  >
                    ยืนยันทำสัญญา
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==============================
          Toast
      ============================== */}

      <div className={`toast ${showToast ? "show" : ""}`} id="toast">
        <span className="dot"></span>

        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}
