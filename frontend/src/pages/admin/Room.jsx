import React, { useEffect, useState } from "react";

const API_URL = "http://localhost:4000/api";

export default function Room() {
  // =================================
  // State
  // =================================

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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
        throw new Error(
          data.message || "ไม่สามารถดึงข้อมูลห้องได้"
        );
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
      roomNumber:
        room.roomNumber ||
        room.room_number ||
        "",

      floor:
        room.floor ||
        "",

      type:
        room.type ||
        "studio",

      size:
        room.size ||
        "",

      monthlyRent:
        room.rent ??
        room.monthlyRent ??
        room.monthly_rent ??
        "",

      roomStatus:
        room.roomStatus ||
        room.room_status ||
        room.status ||
        "available",

      tenantName:
        room.tenantName ||
        room.tenant_name ||
        room.tenant ||
        "",
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
      monthlyRent:
        room.rent ??
        room.monthlyRent ??
        room.monthly_rent ??
        "",
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

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roomForm),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "ไม่สามารถบันทึกข้อมูลห้องได้"
        );
      }

      closeModal();

      await fetchRooms();

      triggerToast(
        isEdit
          ? "แก้ไขข้อมูลห้องเรียบร้อย"
          : "เพิ่มห้องพักใหม่เรียบร้อย"
      );
    } catch (error) {
      console.error("Save Room Error:", error);

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
      `${API_URL}/users/tenant/${contractForm.tenantId}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "ไม่พบข้อมูลผู้เช่า"
      );
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
      triggerToast(
        "กรุณาค้นหาและยืนยันผู้เช่าก่อน"
      );

      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/contracts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: selectedRoom.id,
            tenantId: contractForm.tenantId,
            monthlyRent:
              contractForm.monthlyRent,
            startDate:
              contractForm.startDate,
            endDate:
              contractForm.endDate,

            tenantName:
              tenantInfo.name ||
              tenantInfo.full_name ||
              tenantInfo.tenantName ||
              "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "ไม่สามารถทำสัญญาได้"
        );
      }

      closeModal();

      await fetchRooms();

      triggerToast(
        "ทำสัญญาเช่าเรียบร้อย"
      );
    } catch (error) {
      console.error(
        "Save Contract Error:",
        error
      );

      triggerToast(error.message);
    }
  };

  // =================================
  // แจ้งเตือนลูกบ้าน
  // =================================

  const notifyTenant = async (room) => {
    try {
      const response = await fetch(
        `${API_URL}/rooms/${room.id}/notify`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "ไม่สามารถแจ้งเตือนได้"
        );
      }

      triggerToast(
        data.message ||
          "ส่งการแจ้งเตือนเรียบร้อย"
      );
    } catch (error) {
      console.error(
        "Notify Tenant Error:",
        error
      );

      triggerToast(error.message);
    }
  };

  // =================================
  // กรองข้อมูล
  // =================================

  const filteredRooms = rooms.filter(
    (room) => {
      const roomNumber =
        room.roomNumber ||
        room.room_number ||
        "";

      const tenantName =
        room.tenantName ||
        room.tenant_name ||
        room.tenant ||
        "";

      const status = getStatusText(
        room.roomStatus ||
          room.room_status ||
          room.status
      );

      const searchText =
        search.toLowerCase();

      const matchSearch =
        roomNumber
          .toLowerCase()
          .includes(searchText) ||
        tenantName
          .toLowerCase()
          .includes(searchText);

      let matchStatus = true;

      if (statusFilter === "empty") {
        matchStatus =
          status === "ว่าง";
      }

      if (statusFilter === "occupied") {
        matchStatus =
          status === "มีผู้พัก";
      }

      if (statusFilter === "repair") {
        matchStatus =
          status === "แจ้งซ่อม";
      }

      if (statusFilter === "due") {
        matchStatus =
          status === "ค้างชำระ";
      }

      return (
        matchSearch &&
        matchStatus
      );
    }
  );

  // =================================
  // Render
  // =================================

  return (
    <div
      className="page"
      data-p="ad-room"
    >
      {/* ==============================
          Header
      ============================== */}

      <div className="page-head">
        <div className="eyebrow">
          จัดการห้องพัก
        </div>

        <h2>
          ข้อมูลห้องพักและสัญญาเช่า
        </h2>

        <p>
          จัดการสัญญาเช่า เพิ่ม/แก้ไขข้อมูลผู้เช่า
          และบันทึกประวัติการเข้าพัก
        </p>
      </div>

      {/* ==============================
          Search / Filter
      ============================== */}

      <div
        className="card card-pad"
        style={{
          marginBottom: "22px",
        }}
      >
        <h4
          style={{
            marginBottom: "16px",
            fontSize: "15px",
          }}
        >
          ค้นหา / กรองข้อมูลห้องพัก
        </h4>

        <div className="grid-3">
          <div
            className="field"
            style={{
              marginBottom: 0,
            }}
          >
            <label>
              ค้นหาตามเลขห้องหรือชื่อ
            </label>

            <input
              type="text"
              placeholder="เช่น A102, ณัฐชา"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div
            className="field"
            style={{
              marginBottom: 0,
            }}
          >
            <label>
              สถานะห้อง
            </label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >
              <option value="">
                ทั้งหมด
              </option>

              <option value="empty">
                ว่าง
              </option>

              <option value="occupied">
                มีผู้พัก
              </option>

              <option value="repair">
                แจ้งซ่อม
              </option>

              <option value="due">
                ค้างชำระ
              </option>
            </select>
          </div>

          <div
            className="field"
            style={{
              marginBottom: 0,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                height: "42px",
              }}
              onClick={openAddRoom}
            >
              + เพิ่มห้องพักใหม่
            </button>
          </div>
        </div>
      </div>

      {/* ==============================
          Table
      ============================== */}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  เลขห้อง
                </th>

                <th>
                  ชั้น
                </th>

                <th>
                  ผู้เช่าปัจจุบัน
                </th>

                <th>
                  เบอร์โทรศัพท์
                </th>

                <th>
                  ค่าเช่า/เดือน
                </th>

                <th>
                  สถานะ
                </th>

                <th>
                  การจัดการ
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign:
                        "center",
                      padding: "40px",
                      color:
                        "var(--text-dim)",
                    }}
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRooms.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      textAlign:
                        "center",
                      padding: "40px",
                      color:
                        "var(--text-dim)",
                    }}
                  >
                    ไม่พบข้อมูลห้องพัก
                  </td>
                </tr>
              ) : (
                filteredRooms.map(
                  (room) => {
                    const roomNumber =
                      room.roomNumber ||
                      room.room_number ||
                      "-";

                    const floor =
                      room.floor || "-";

                    const tenantName =
                      room.tenantName ||
                      room.tenant_name ||
                      room.tenant ||
                      "—";

                    const phone =
                      room.phone ||
                      room.tenantPhone ||
                      room.tenant_phone ||
                      "—";

                    const rent =
                      room.rent ??
                      room.monthlyRent ??
                      room.monthly_rent ??
                      0;

                    const rawStatus =
                      room.roomStatus ||
                      room.room_status ||
                      room.status ||
                      "available";

                    const status =
                      getStatusText(
                        rawStatus
                      );

                    return (
                      <tr
                        key={room.id}
                      >
                        <td
                          className="mono"
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {roomNumber}
                        </td>

                        <td>
                          ชั้น {floor}
                        </td>

                        <td>
                          {tenantName}
                        </td>

                        <td className="mono">
                          {phone}
                        </td>

                        <td className="mono">
                          ฿
                          {Number(
                            rent
                          ).toLocaleString(
                            "th-TH"
                          )}
                        </td>

                        <td>
                          <span
                            className={`badge ${getStatusBadge(
                              rawStatus
                            )}`}
                          >
                            {status}
                          </span>
                        </td>

                        <td>
                          <div className="rowbtns">
                            {/* แก้ไข */}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                openEditRoom(
                                  room
                                )
                              }
                            >
                              แก้ไข
                            </button>

                            {/* ทำสัญญา */}
                            {status ===
                              "ว่าง" && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  openContract(
                                    room
                                  )
                                }
                              >
                                ทำสัญญา
                              </button>
                            )}

                            {/* แจ้งเตือน */}
                            {status ===
                              "ค้างชำระ" && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() =>
                                  notifyTenant(
                                    room
                                  )
                                }
                              >
                                แจ้งเตือน
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {showModal && (
        <div
          className="modal-overlay active"
          onClick={closeModal}
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* =================================================
                เพิ่ม / แก้ไขห้อง
            ================================================= */}

            {(modalType === "add" ||
              modalType === "edit") && (
              <form
                onSubmit={saveRoom}
              >
                <h3>
                  {modalType ===
                  "add"
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
                    fontSize:
                      "13.8px",
                  }}
                >
                  {/* เลขห้อง */}

                  <div className="field">
                    <label>
                      เลขห้อง
                    </label>

                    <input
                      type="text"
                      value={
                        roomForm.roomNumber
                      }
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          roomNumber:
                            e.target
                              .value,
                        })
                      }
                      placeholder="เช่น A101"
                      required
                    />
                  </div>

                  {/* ชั้น */}

                  <div className="field">
                    <label>
                      ชั้น
                    </label>

                    <select
                      value={
                        roomForm.floor
                      }
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          floor:
                            e.target
                              .value,
                        })
                      }
                      required
                    >
                      <option value="">
                        เลือกชั้น
                      </option>

                      <option value="1">
                        ชั้น 1
                      </option>

                      <option value="2">
                        ชั้น 2
                      </option>

                      <option value="3">
                        ชั้น 3
                      </option>
                    </select>
                  </div>

                  {/* ประเภท */}

                  <div className="field">
                    <label>
                      ประเภทห้อง
                    </label>

                    <select
                      value={
                        roomForm.type
                      }
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          type:
                            e.target
                              .value,
                        })
                      }
                    >
                      <option value="studio">
                        Studio
                      </option>

                      <option value="1-bedroom">
                        1 Bedroom
                      </option>
                    </select>
                  </div>

                  {/* ขนาด */}

                  <div className="field">
                    <label>
                      ขนาดห้อง
                      (ตร.ม.)
                    </label>

                    <input
                      type="number"
                      value={
                        roomForm.size
                      }
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          size:
                            e.target
                              .value,
                        })
                      }
                      placeholder="เช่น 30"
                    />
                  </div>

                  {/* ค่าเช่า */}

                  <div className="field">
                    <label>
                      ค่าเช่า/เดือน
                    </label>

                    <input
                      type="number"
                      value={
                        roomForm.monthlyRent
                      }
                      onChange={(e) =>
                        setRoomForm({
                          ...roomForm,
                          monthlyRent:
                            e.target
                              .value,
                        })
                      }
                      placeholder="เช่น 6500"
                      required
                    />
                  </div>

                  {/* ชื่อผู้เช่า */}

                  {modalType ===
                    "edit" && (
                    <div className="field">
                      <label>
                        ชื่อผู้เช่าปัจจุบัน
                      </label>

                      <input
                        type="text"
                        value={
                          roomForm.tenantName
                        }
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            tenantName:
                              e.target
                                .value,
                          })
                        }
                        placeholder="เช่น นายสมชาย ใจดี"
                      />
                    </div>
                  )}

                  {/* สถานะ */}

                  {modalType ===
                    "edit" && (
                    <div className="field">
                      <label>
                        สถานะห้อง
                      </label>

                      <select
                        value={
                          roomForm.roomStatus
                        }
                        onChange={(e) =>
                          setRoomForm({
                            ...roomForm,
                            roomStatus:
                              e.target
                                .value,
                          })
                        }
                      >
                        <option value="available">
                          ว่าง
                        </option>

                        <option value="occupied">
                          มีผู้พัก
                        </option>

                        <option value="maintenance">
                          แจ้งซ่อม
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-foot">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      closeModal
                    }
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            )}

            {/* =================================================
                ทำสัญญา
            ================================================= */}

            {modalType ===
              "contract" && (
              <form
                onSubmit={
                  saveContract
                }
              >
                <h3>
                  ทำสัญญาเช่า ห้อง{" "}
                  {selectedRoom?.roomNumber ||
                    selectedRoom?.room_number ||
                    ""}
                </h3>

                <div
                  className="col gap-12"
                  style={{
                    fontSize:
                      "13.8px",
                  }}
                >
                  {/* ID ผู้เช่า */}

                  <div className="field">
                    <label>
                      ID ผู้เช่า
                    </label>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="number"
                        value={
                          contractForm.tenantId
                        }
                        onChange={(e) => {
                          setContractForm(
                            {
                              ...contractForm,
                              tenantId:
                                e.target
                                  .value,
                            }
                          );

                          setTenantInfo(
                            null
                          );
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
                        onClick={
                          findTenant
                        }
                        disabled={
                          tenantLoading
                        }
                        style={{
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {tenantLoading
                          ? "กำลังค้นหา..."
                          : "ค้นหา"}
                      </button>
                    </div>
                  </div>

                  {/* ข้อมูลผู้เช่า */}

                  {tenantInfo && (
                    <div
                      className="card"
                      style={{
                        padding:
                          "14px",
                        background:
                          "var(--sage-bg)",
                        borderColor:
                          "var(--sage)",
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            "12px",
                          color:
                            "var(--text-dim)",
                          marginBottom:
                            "4px",
                        }}
                      >
                        ผู้เช่าที่พบ
                      </div>

                      <div
                        style={{
                          fontWeight:
                            600,
                          color:
                            "var(--ink)",
                        }}
                      >
                        {tenantInfo.name ||
                          tenantInfo.full_name ||
                          tenantInfo.tenantName ||
                          "-"}
                      </div>

                      {(
                        tenantInfo.phone ||
                        tenantInfo.phone_number
                      ) && (
                        <div
                          className="mono"
                          style={{
                            fontSize:
                              "12px",
                            color:
                              "var(--text-dim)",
                            marginTop:
                              "3px",
                          }}
                        >
                          {tenantInfo.phone ||
                            tenantInfo.phone_number}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ค่าเช่า */}

                  <div className="field">
                    <label>
                      ค่าเช่า/เดือน
                    </label>

                    <input
                      type="number"
                      value={
                        contractForm.monthlyRent
                      }
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          monthlyRent:
                            e.target
                              .value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* วันที่เริ่ม */}

                  <div className="field">
                    <label>
                      วันที่เริ่มสัญญา
                    </label>

                    <input
                      type="date"
                      value={
                        contractForm.startDate
                      }
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          startDate:
                            e.target
                              .value,
                        })
                      }
                      required
                    />
                  </div>

                  {/* วันที่สิ้นสุด */}

                  <div className="field">
                    <label>
                      วันที่สิ้นสุดสัญญา
                    </label>

                    <input
                      type="date"
                      value={
                        contractForm.endDate
                      }
                      onChange={(e) =>
                        setContractForm({
                          ...contractForm,
                          endDate:
                            e.target
                              .value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="modal-foot">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      closeModal
                    }
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={
                      !tenantInfo
                    }
                    style={{
                      opacity:
                        !tenantInfo
                          ? 0.5
                          : 1,
                      cursor:
                        !tenantInfo
                          ? "not-allowed"
                          : "pointer",
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

      <div
        className={`toast ${
          showToast
            ? "show"
            : ""
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