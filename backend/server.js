import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

// =================================
// Test Backend
// =================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend API Running",
  });
});

// =================================
// Test Database
// =================================

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");

    res.json({
      success: true,
      message: "Database connected successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Database Error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// =================================
// Dashboard API
// =================================

app.get("/api/dashboard", async (req, res) => {
  try {
    const [rooms] = await db.query(`
      SELECT
        r.id,
        r.room_number,
        r.floor,
        r.type,
        r.size_sqm,
        r.monthly_rent,
        r.status AS room_status,

        c.id AS contract_id,
        c.tenant_id,
        c.monthly_rent AS contract_rent,
        c.status AS contract_status,

        u.full_name AS tenant_name,
        u.phone AS tenant_phone,

        (
          SELECT p.status
          FROM payments p
          WHERE p.contract_id = c.id
          ORDER BY
            CASE
              WHEN p.status = 'overdue' THEN 1
              WHEN p.status = 'pending' THEN 2
              WHEN p.status = 'paid' THEN 3
              ELSE 4
            END,
            p.due_date DESC,
            p.id DESC
          LIMIT 1
        ) AS payment_status,

        (
          SELECT p.due_date
          FROM payments p
          WHERE p.contract_id = c.id
          ORDER BY
            CASE
              WHEN p.status = 'overdue' THEN 1
              WHEN p.status = 'pending' THEN 2
              WHEN p.status = 'paid' THEN 3
              ELSE 4
            END,
            p.due_date DESC,
            p.id DESC
          LIMIT 1
        ) AS payment_due_date,

        (
          SELECT p.amount
          FROM payments p
          WHERE p.contract_id = c.id
          ORDER BY
            CASE
              WHEN p.status = 'overdue' THEN 1
              WHEN p.status = 'pending' THEN 2
              WHEN p.status = 'paid' THEN 3
              ELSE 4
            END,
            p.due_date DESC,
            p.id DESC
          LIMIT 1
        ) AS payment_amount,

        (
          SELECT COUNT(*)
          FROM complaints cp
          WHERE cp.room_id = r.id
            AND cp.status IN ('open', 'in_progress')
        ) AS active_complaints

      FROM rooms r

      LEFT JOIN contracts c
        ON c.room_id = r.id
        AND c.status = 'active'

      LEFT JOIN users u
        ON u.id = c.tenant_id

      ORDER BY r.room_number ASC
    `);

    const formattedRooms = rooms.map((room) => {
      let status = "ว่าง";

      if (room.room_status === "occupied") {
        status = "มีผู้พัก";
      } else if (room.room_status === "maintenance") {
        status = "แจ้งซ่อม";
      } else if (room.room_status === "available") {
        status = "ว่าง";
      }

      if (
        room.payment_status === "overdue" &&
        room.room_status === "occupied"
      ) {
        status = "ค้างชำระ";
      }

      if (
        Number(room.active_complaints) > 0 &&
        room.room_status === "occupied"
      ) {
        status = "แจ้งซ่อม";
      }

      let payStatus = "—";

      if (room.payment_status === "paid") {
        payStatus = "ชำระแล้ว";
      } else if (room.payment_status === "pending") {
        payStatus = "รอตรวจสอบ";
      } else if (room.payment_status === "overdue") {
        payStatus = "ค้างชำระ";
      }

      return {
        id: room.id,
        roomNumber: room.room_number,
        floor: room.floor,
        type: room.type,
        size: Number(room.size_sqm || 0),

        status,

        tenantId: room.tenant_id || null,
        tenant: room.tenant_name || "—",
        phone: room.tenant_phone || "—",

        rent: Number(
          room.contract_rent || room.monthly_rent || 0
        ),

        payStatus,

        paymentDueDate: room.payment_due_date,

        paymentAmount: room.payment_amount
          ? Number(room.payment_amount)
          : null,

        activeComplaints: Number(
          room.active_complaints || 0
        ),
      };
    });

    const totalRooms = formattedRooms.length;

    const availableRooms = formattedRooms.filter(
      (room) => room.status === "ว่าง"
    ).length;

    const maintenanceRooms = formattedRooms.filter(
      (room) => room.status === "แจ้งซ่อม"
    ).length;

    const overduePayments = formattedRooms.filter(
      (room) => room.payStatus === "ค้างชำระ"
    ).length;

    res.json({
      success: true,

      summary: {
        totalRooms,
        availableRooms,
        maintenanceRooms,
        overduePayments,
      },

      rooms: formattedRooms,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูล Dashboard ได้",
      error: error.message,
    });
  }
});

// =================================
// Rooms API
// =================================

// ดึงข้อมูลห้องทั้งหมด
app.get("/api/rooms", async (req, res) => {
  try {
    const [rooms] = await db.query(`
      SELECT
        r.id,
        r.room_number,
        r.floor,
        r.type,
        r.size_sqm,
        r.monthly_rent,
        r.status AS room_status,

        c.id AS contract_id,
        c.tenant_id,
        c.monthly_rent AS contract_rent,
        c.status AS contract_status,

        u.full_name AS tenant_name,
        u.phone AS tenant_phone,

        (
          SELECT p.status
          FROM payments p
          WHERE p.contract_id = c.id
          ORDER BY
            CASE
              WHEN p.status = 'overdue' THEN 1
              WHEN p.status = 'pending' THEN 2
              WHEN p.status = 'paid' THEN 3
              ELSE 4
            END,
            p.due_date DESC,
            p.id DESC
          LIMIT 1
        ) AS payment_status,

        (
          SELECT COUNT(*)
          FROM complaints cp
          WHERE cp.room_id = r.id
            AND cp.status IN ('open', 'in_progress')
        ) AS active_complaints

      FROM rooms r

      LEFT JOIN contracts c
        ON c.room_id = r.id
        AND c.status = 'active'

      LEFT JOIN users u
        ON u.id = c.tenant_id

      ORDER BY r.floor ASC, r.room_number ASC
    `);

    const formattedRooms = rooms.map((room) => {
      let status = "ว่าง";

      if (room.room_status === "occupied") {
        status = "มีผู้พัก";
      }

      if (room.room_status === "maintenance") {
        status = "แจ้งซ่อม";
      }

      if (
        room.payment_status === "overdue" &&
        room.room_status === "occupied"
      ) {
        status = "ค้างชำระ";
      }

      if (
        Number(room.active_complaints) > 0 &&
        room.room_status === "occupied"
      ) {
        status = "แจ้งซ่อม";
      }

      let payStatus = "—";

      if (room.payment_status === "paid") {
        payStatus = "ชำระแล้ว";
      } else if (room.payment_status === "pending") {
        payStatus = "รอตรวจสอบ";
      } else if (room.payment_status === "overdue") {
        payStatus = "ค้างชำระ";
      }

      return {
        id: room.id,
        roomNumber: room.room_number,
        floor: room.floor,
        type: room.type,
        size: Number(room.size_sqm || 0),

        roomStatus: room.room_status,
        status,

        // ID ผู้เช่าจากตาราง users
        tenantId: room.tenant_id || null,

        tenant: room.tenant_name || "—",
        phone: room.tenant_phone || "—",

        rent: Number(
          room.contract_rent ||
          room.monthly_rent ||
          0
        ),

        payStatus,

        contractId: room.contract_id || null,
        contractStatus: room.contract_status || null,

        activeComplaints: Number(
          room.active_complaints || 0
        ),
      };
    });

    res.json({
      success: true,
      data: formattedRooms,
    });
  } catch (error) {
    console.error("Rooms API Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถดึงข้อมูลห้องพักได้",
      error: error.message,
    });
  }
});

// =================================
// เพิ่มห้องใหม่
// =================================

app.post("/api/rooms", async (req, res) => {
  try {
    const {
      roomNumber,
      floor,
      type,
      size,
      monthlyRent,
    } = req.body;

    if (!roomNumber || !floor || !monthlyRent) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกเลขห้อง ชั้น และค่าเช่า",
      });
    }

    const [existing] = await db.query(
      `
      SELECT id
      FROM rooms
      WHERE room_number = ?
      `,
      [roomNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "เลขห้องนี้มีอยู่แล้ว",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO rooms
      (
        room_number,
        floor,
        type,
        size_sqm,
        monthly_rent,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'available')
      `,
      [
        roomNumber,
        floor,
        type || "studio",
        size || 0,
        monthlyRent,
      ]
    );

    res.json({
      success: true,
      message: "เพิ่มห้องพักเรียบร้อย",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Create Room Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถเพิ่มห้องพักได้",
      error: error.message,
    });
  }
});

// =================================
// แก้ไขห้อง
// =================================

app.put("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      roomNumber,
      floor,
      type,
      size,
      monthlyRent,
      roomStatus,
    } = req.body;

    if (!roomNumber || !floor || !monthlyRent) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลห้องให้ครบ",
      });
    }

    await db.query(
      `
      UPDATE rooms
      SET
        room_number = ?,
        floor = ?,
        type = ?,
        size_sqm = ?,
        monthly_rent = ?,
        status = ?
      WHERE id = ?
      `,
      [
        roomNumber,
        floor,
        type || "studio",
        size || 0,
        monthlyRent,
        roomStatus || "available",
        id,
      ]
    );

    res.json({
      success: true,
      message: "แก้ไขข้อมูลห้องเรียบร้อย",
    });
  } catch (error) {
    console.error("Update Room Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถแก้ไขห้องได้",
      error: error.message,
    });
  }
});

// =================================
// ทำสัญญาเช่า
// =================================

app.post("/api/contracts", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      roomId,
      tenantId,
      monthlyRent,
      startDate,
      endDate,
    } = req.body;

    if (
      !roomId ||
      !tenantId ||
      !monthlyRent ||
      !startDate
    ) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลสัญญาให้ครบ",
      });
    }

    // =================================
    // ตรวจสอบว่า tenantId มีอยู่จริง
    // และเป็นผู้เช่า
    // =================================

    const [tenant] = await connection.query(
      `
      SELECT id
      FROM users
      WHERE id = ?
        AND role = 'tenant'
      LIMIT 1
      `,
      [tenantId]
    );

    if (tenant.length === 0) {
      return res.status(400).json({
        success: false,
        message: "ไม่พบผู้เช่าจาก ID นี้",
      });
    }

    await connection.beginTransaction();

    // ตรวจสอบว่าห้องมีสัญญา active อยู่หรือไม่
    const [activeContract] = await connection.query(
      `
      SELECT id
      FROM contracts
      WHERE room_id = ?
        AND status = 'active'
      `,
      [roomId]
    );

    if (activeContract.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "ห้องนี้มีผู้เช่าอยู่แล้ว",
      });
    }

    // เพิ่มสัญญา
    const [result] = await connection.query(
      `
      INSERT INTO contracts
      (
        room_id,
        tenant_id,
        monthly_rent,
        start_date,
        end_date,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'active')
      `,
      [
        roomId,
        tenantId,
        monthlyRent,
        startDate,
        endDate || null,
      ]
    );

    // เปลี่ยนสถานะห้อง
    await connection.query(
      `
      UPDATE rooms
      SET status = 'occupied'
      WHERE id = ?
      `,
      [roomId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "ทำสัญญาเช่าเรียบร้อย",
      contractId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create Contract Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถทำสัญญาได้",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// =================================
// แจ้งเตือนผู้เช่า
// =================================

app.post("/api/rooms/:id/notify", async (req, res) => {
  try {
    const { id } = req.params;

    const [rooms] = await db.query(
      `
      SELECT
        r.room_number,
        c.tenant_id,
        u.full_name,
        u.phone
      FROM rooms r

      LEFT JOIN contracts c
        ON c.room_id = r.id
        AND c.status = 'active'

      LEFT JOIN users u
        ON u.id = c.tenant_id

      WHERE r.id = ?
      `,
      [id]
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบห้องนี้",
      });
    }

    const room = rooms[0];

    if (!room.tenant_id || !room.full_name) {
      return res.status(400).json({
        success: false,
        message: "ห้องนี้ยังไม่มีผู้เช่า",
      });
    }

    console.log(
      `แจ้งเตือนผู้เช่า: ห้อง ${room.room_number} - ${room.full_name}`
    );

    res.json({
      success: true,
      message: `แจ้งเตือน ${room.full_name} เรียบร้อย`,
      tenantId: room.tenant_id,
    });
  } catch (error) {
    console.error("Notify Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถแจ้งเตือนได้",
      error: error.message,
    });
  }
});

// =================================
// ค้นหาผู้เช่าจาก ID
// =================================
//
// GET
// /api/users/tenant/:id
//
// ตัวอย่าง
// http://localhost:4000/api/users/tenant/5
//
// =================================

app.get("/api/users/tenant/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ตรวจสอบว่า ID เป็นตัวเลขหรือไม่
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID ผู้เช่าต้องเป็นตัวเลข",
      });
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        username,
        full_name,
        phone,
        email,
        role
      FROM users
      WHERE id = ?
        AND role = 'tenant'
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบผู้เช่าจาก ID นี้",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Find Tenant Error:", error);

    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการค้นหาผู้เช่า",
      error: error.message,
    });
  }
});

// =================================
// Start Server
// =================================

const PORT = 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `ขณะนี้เซิฟเวอร์กำลังรันอยู่บนพอร์ต http://localhost:${PORT} งับ`
  );
});