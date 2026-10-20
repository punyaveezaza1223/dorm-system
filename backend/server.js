import express from "express";
import cors from "cors";
import db from "./db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { existsSync, mkdirSync, unlinkSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const app = express();
app.use(cors());
app.use(express.json());

const paymentSlipDirectory = join(process.cwd(), "uploads", "payment-slips");
if (!existsSync(paymentSlipDirectory)) mkdirSync(paymentSlipDirectory, { recursive: true });
const repairImageDirectory = join(process.cwd(), "private-uploads", "repair-images");
if (!existsSync(repairImageDirectory)) mkdirSync(repairImageDirectory, { recursive: true });
const paymentSlipUpload = multer({
  storage: multer.diskStorage({
    destination: paymentSlipDirectory,
    filename: (req, file, done) => done(null, `slip-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, done) => done(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)),
});
const repairImageUpload = multer({
  storage: multer.diskStorage({
    destination: repairImageDirectory,
    filename: (req, file, done) => done(null, `repair-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, done) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const error = new Error("รองรับเฉพาะไฟล์ JPG, JPEG, PNG และ WEBP");
      error.code = "INVALID_REPAIR_IMAGE";
      return done(error);
    }
    return done(null, true);
  },
});
app.use("/uploads", express.static(join(process.cwd(), "uploads")));

// =================================
// JWT Secret
// =================================

const JWT_SECRET = "rental-system-secret-key";

// =================================
// Authentication Middleware
// =================================

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "กรุณาเข้าสู่ระบบ",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบ Token",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {
    console.error("Auth Error:", error);

    return res.status(401).json({
      success: false,
      message: "Session หมดอายุหรือ Token ไม่ถูกต้อง",
    });
  }
};

// A unique event key prevents duplicate notifications when an API request is retried.
const createNotification = async (recipientId, type, title, body, relatedId, destination, eventKey, connection = db) => {
  if (!recipientId) return;
  await connection.query(`INSERT IGNORE INTO notifications
    (recipient_id, type, title, body, related_id, destination, event_key)
    VALUES (?, ?, ?, ?, ?, ?, ?)`, [recipientId, type, title, body || null, relatedId || null, destination || null, eventKey]);
};

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const filter = String(req.query.filter || 'all');
    const types = ['invoice', 'payment', 'repair', 'parcel', 'announcement'];
    const where = ['recipient_id = ?']; const params = [req.user.id];
    if (filter === 'unread') where.push('read_at IS NULL');
    if (types.includes(filter)) { where.push('type = ?'); params.push(filter); }
    const [rows] = await db.query(`SELECT id, type, title, body, related_id, destination, read_at, created_at
      FROM notifications WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC LIMIT 100`, params);
    const [[count]] = await db.query('SELECT COUNT(*) unread FROM notifications WHERE recipient_id = ? AND read_at IS NULL', [req.user.id]);
    res.json({ success: true, data: rows, unreadCount: Number(count.unread) });
  } catch (error) { console.error('Notifications read error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถโหลดการแจ้งเตือนได้' }); }
});

app.get('/api/notifications/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'รหัสการแจ้งเตือนไม่ถูกต้อง' });
  try {
    await db.query('UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND recipient_id = ?', [id, req.user.id]);
    const [rows] = await db.query('SELECT id, type, title, body, related_id, destination, read_at, created_at FROM notifications WHERE id = ? AND recipient_id = ?', [id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบการแจ้งเตือน' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { res.status(500).json({ success: false, message: 'ไม่สามารถเปิดการแจ้งเตือนได้' }); }
});

app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try { await db.query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = ? AND read_at IS NULL', [req.user.id]); res.json({ success: true }); }
  catch { res.status(500).json({ success: false, message: 'ไม่สามารถอัปเดตการแจ้งเตือนได้' }); }
});

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

// These values mirror the rooms.type ENUM. Keep legacy values so editing an
// existing room does not silently change its stored type.
const SUPPORTED_ROOM_TYPES = ["studio", "1-bedroom", "1bed", "2bed"];

const getValidatedRoomType = (value) => {
  if (value === undefined || value === null || value === "") {
    return "studio";
  }

  if (typeof value !== "string") {
    return null;
  }

  const roomType = value.trim();
  return SUPPORTED_ROOM_TYPES.includes(roomType) ? roomType : null;
};

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

    const roomType = getValidatedRoomType(type);

    if (!roomType) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported room type. Choose studio, 1-bedroom, 1bed, or 2bed.",
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
        roomType,
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
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      roomNumber,
      floor,
      type,
      size,
      monthlyRent,
      roomStatus,
      tenantName,
      description,
    } = req.body;

    // ห้องว่างต้องไม่มีผู้เช่าเสมอ แม้ client จะส่งชื่อผู้เช่ามาด้วย
    const roomType = getValidatedRoomType(type);

    if (!roomType) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported room type. Choose studio, 1-bedroom, 1bed, or 2bed.",
      });
    }

    const isAvailable = roomStatus === "available";
    const hasTenant =
      !isAvailable &&
      tenantName &&
      tenantName.toString().trim() !== "";

    // สถานะอื่น เช่น "แจ้งซ่อม" ใช้ได้แม้ไม่มีผู้เช่า
    const finalStatus = roomStatus;

    await connection.beginTransaction();

    // =================================
    // 1. อัปเดตข้อมูลห้อง
    // =================================

    await connection.query(
      `
      UPDATE rooms
      SET
        room_number = ?,
        floor = ?,
        type = ?,
        size_sqm = ?,
        monthly_rent = ?,
        status = ?,
        tenant_name = ?,
        description = ?
      WHERE id = ?
      `,
      [
        roomNumber,
        floor,
        roomType,
        size || 0,
        monthlyRent,
        finalStatus,
        hasTenant
          ? tenantName.toString().trim()
          : null,
        description || null,
        id,
      ]
    );

    // =================================
    // 2. ถ้าลบชื่อผู้เช่า
    // ให้ปิดสัญญา active ของห้องนี้
    // =================================

    if (!hasTenant) {
      await connection.query(
        `
        UPDATE contracts
        SET
          status = 'terminated'
        WHERE room_id = ?
          AND status = 'active'
        `,
        [id]
      );
    }

    await connection.commit();

    console.log(
      `อัปเดตห้อง ${id} เรียบร้อย`,
      {
        tenantName: hasTenant
          ? tenantName
          : null,
        status: finalStatus,
      }
    );

    res.json({
      success: true,
      message: hasTenant
        ? "แก้ไขข้อมูลห้องเรียบร้อย"
        : "ลบผู้เช่าออกจากห้องและปรับห้องเป็นห้องว่างเรียบร้อย",
    });

  } catch (error) {

    await connection.rollback();

    console.error(
      "Update Room Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "ไม่สามารถแก้ไขข้อมูลห้องได้",
      error: error.message,
    });

  } finally {
    connection.release();
  }
});

// =================================
// ลบห้อง
// =================================

app.delete("/api/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM rooms WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบห้องที่ต้องการลบ",
      });
    }

    res.json({
      success: true,
      message: "ลบห้องเรียบร้อยแล้ว",
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message:
          "ไม่สามารถลบห้องที่มีสัญญาหรือรายการที่เกี่ยวข้องอยู่ได้",
      });
    }

    console.error("Delete Room Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถลบห้องได้",
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
// Register API
// =================================

app.post("/api/auth/register", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      username,
      password,
      roomNumber,
    } = req.body;

    // -----------------------------
    // ตรวจสอบข้อมูล
    // -----------------------------

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !email ||
      !username ||
      !password ||
      !roomNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกข้อมูลให้ครบ",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
      });
    }

    // -----------------------------
    // ตรวจสอบ Username
    // -----------------------------

    const [existingUsername] = await db.query(
      `
      SELECT id
      FROM users
      WHERE username = ?
      LIMIT 1
      `,
      [username]
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username นี้ถูกใช้งานแล้ว",
      });
    }

    // -----------------------------
    // ตรวจสอบ Email
    // -----------------------------

    const [existingEmail] = await db.query(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email นี้ถูกใช้งานแล้ว",
      });
    }

    // -----------------------------
    // ตรวจสอบเบอร์โทร
    // -----------------------------

    const [existingPhone] = await db.query(
      `
      SELECT id
      FROM users
      WHERE phone = ?
      LIMIT 1
      `,
      [phone]
    );

    if (existingPhone.length > 0) {
      return res.status(400).json({
        success: false,
        message: "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว",
      });
    }

    // -----------------------------
    // ค้นหาห้อง
    // -----------------------------

    const [rooms] = await db.query(
      `
      SELECT
        id,
        room_number,
        monthly_rent,
        status
      FROM rooms
      WHERE room_number = ?
      LIMIT 1
      `,
      [roomNumber]
    );

    if (rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: `ไม่พบห้อง ${roomNumber} ในระบบ`,
      });
    }

    const room = rooms[0];

    // -----------------------------
    // ตรวจสอบห้องว่าง
    // -----------------------------

    if (room.status !== "available") {
      return res.status(400).json({
        success: false,
        message: `ห้อง ${roomNumber} ไม่สามารถสมัครได้ เนื่องจากห้องไม่ว่าง`,
      });
    }

    // -----------------------------
    // เริ่ม Transaction
    // -----------------------------

    await connection.beginTransaction();

    // -----------------------------
    // Hash Password
    // -----------------------------

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // -----------------------------
    // สร้าง User
    // -----------------------------

    const [userResult] = await connection.query(
      `
      INSERT INTO users
      (
        username,
        password,
        role,
        full_name,
        phone,
        email
      )
      VALUES (?, ?, 'tenant', ?, ?, ?)
      `,
      [
        username,
        hashedPassword,
        `${firstName} ${lastName}`,
        phone,
        email,
      ]
    );

    const userId = userResult.insertId;

    // -----------------------------
    // สร้าง Contract
    // -----------------------------

    const startDate = new Date();

    const endDate = new Date();
    endDate.setFullYear(
      endDate.getFullYear() + 1
    );

    const formatDate = (date) => {
      return date.toISOString().split("T")[0];
    };

    await connection.query(
      `
      INSERT INTO contracts
      (
        room_id,
        tenant_id,
        start_date,
        end_date,
        monthly_rent,
        deposit,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        room.id,
        userId,
        formatDate(startDate),
        formatDate(endDate),
        room.monthly_rent,
        room.monthly_rent * 2,
      ]
    );

    // -----------------------------
    // เปลี่ยนสถานะห้อง
    // -----------------------------

    await connection.query(
      `
      UPDATE rooms
      SET status = 'occupied'
      WHERE id = ?
      `,
      [room.id]
    );

    // -----------------------------
    // Commit
    // -----------------------------

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "สมัครสมาชิกเรียบร้อย",
      userId,
      room: {
        id: room.id,
        roomNumber: room.room_number,
      },
    });

  } catch (error) {

    await connection.rollback();

    console.error(
      "Register Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "ไม่สามารถสมัครสมาชิกได้",
      error: error.message,
    });

  } finally {

    connection.release();

  }
});

// =================================
// Login API
// =================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      login,
      password,
      role,
    } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอก Username / Email / เบอร์โทร และรหัสผ่าน",
      });
    }

    // -----------------------------
    // ค้นหา User
    // -----------------------------

    const [users] = await db.query(
      `
      SELECT
        id,
        username,
        password,
        role,
        full_name,
        phone,
        email
      FROM users
      WHERE
        username = ?
        OR email = ?
        OR phone = ?
      LIMIT 1
      `,
      [login, login, login]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "ไม่พบผู้ใช้งานนี้",
      });
    }

    const user = users[0];

    // -----------------------------
    // ตรวจสอบ Role
    // -----------------------------

    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "ประเภทบัญชีไม่ถูกต้อง",
      });
    }

    // -----------------------------
    // ตรวจสอบ Password
    // -----------------------------

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "รหัสผ่านไม่ถูกต้อง",
      });
    }

    // -----------------------------
    // สร้าง JWT
    // -----------------------------

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // -----------------------------
    // ส่งข้อมูล User
    // -----------------------------

    res.json({
      success: true,
      message: "เข้าสู่ระบบสำเร็จ",

      token,

      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "ไม่สามารถเข้าสู่ระบบได้",
      error: error.message,
    });
  }
});

// =================================
// Tenant Profile + Room API
// =================================

app.get(
  "/api/tenant/me",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // -----------------------------
      // ข้อมูล User
      // -----------------------------

      const [users] = await db.query(
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
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบข้อมูลลูกบ้าน",
        });
      }

      const user = users[0];

      // -----------------------------
      // ห้อง + สัญญา
      // -----------------------------

      const [rooms] = await db.query(
        `
        SELECT
          r.id AS room_id,
          r.room_number,
          r.floor,
          r.type,
          r.size_sqm,
          r.monthly_rent AS room_rent,
          r.status AS room_status,
          r.description,

          c.id AS contract_id,
          c.start_date,
          c.end_date,
          c.monthly_rent AS contract_rent,
          c.deposit,
          c.status AS contract_status,
          c.note AS contract_note

        FROM contracts c

        INNER JOIN rooms r
          ON r.id = c.room_id

        WHERE c.tenant_id = ?
          AND c.status = 'active'
          AND CURDATE() BETWEEN DATE(c.start_date) AND DATE(c.end_date)

        ORDER BY c.start_date DESC, c.id DESC
        LIMIT 1
        `,
        [userId]
      );

      const room = rooms.length > 0
        ? rooms[0]
        : null;

      // -----------------------------
      // ส่งข้อมูล
      // -----------------------------

      res.json({
        success: true,

        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },

        room,

      });

    } catch (error) {
      console.error("Tenant Me Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถดึงข้อมูลลูกบ้านได้",
        error: error.message,
      });
    }
  }
);

// =================================
// Tenant Payments API
// =================================

app.get(
  "/api/tenant/payments",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const [payments] = await db.query(
        `
        SELECT
          p.id,
          p.contract_id,
          p.amount,
          p.due_date,
          p.paid_date,
          p.status,
          p.slip_url,
          p.note,

          r.room_number

        FROM payments p

        INNER JOIN contracts c
          ON c.id = p.contract_id

        INNER JOIN rooms r
          ON r.id = c.room_id

        WHERE p.tenant_id = ?

        ORDER BY p.due_date DESC
        `,
        [userId]
      );

      res.json({
        success: true,
        data: payments,
      });

    } catch (error) {
      console.error("Tenant Payments Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถดึงข้อมูลการชำระเงินได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Tenant Complaints API
// =================================

// ดึงรายการร้องเรียนของลูกบ้าน
app.get(
  "/api/tenant/complaints",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const [complaints] = await db.query(
        `
        SELECT
          cp.id,
          cp.room_id,
          cp.tenant_id,
          cp.type,
          cp.title,
          cp.description,
          cp.is_anonymous,
          cp.status,
          cp.admin_note,
          cp.created_at,
          cp.updated_at,
          r.room_number

        FROM complaints cp

        INNER JOIN rooms r
          ON r.id = cp.room_id

        WHERE cp.tenant_id = ?

        ORDER BY cp.created_at DESC, cp.id DESC
        `,
        [userId]
      );

      console.log(
        "Complaint history:",
        complaints
      );

      res.json({
        success: true,
        data: complaints,
      });

    } catch (error) {

      console.error(
        "Tenant Complaints Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "ไม่สามารถดึงข้อมูลเรื่องร้องเรียนได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Create Tenant Complaint
// =================================

app.post(
  "/api/tenant/complaints",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const {
        type,
        title,
        description,
        isAnonymous,
      } = req.body;


      // =============================
      // ตรวจสอบข้อมูล
      // =============================

      if (!type || !title || !description) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลให้ครบ",
        });
      }


      // =============================
      // หาห้องของลูกบ้าน
      // =============================

      const [rooms] = await db.query(
        `
        SELECT
          r.id AS room_id
        FROM contracts c

        INNER JOIN rooms r
          ON r.id = c.room_id

        WHERE c.tenant_id = ?
          AND c.status = 'active'

        LIMIT 1
        `,
        [userId]
      );


      if (rooms.length === 0) {
        return res.status(400).json({
          success: false,
          message: "คุณยังไม่มีห้องพัก",
        });
      }


      const roomId = rooms[0].room_id;


      // =============================
      // บันทึก Complaint
      // =============================

      const [result] = await db.query(
        `
        INSERT INTO complaints
        (
          tenant_id,
          room_id,
          title,
          type,
          description,
          is_anonymous,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'open')
        `,
        [
          userId,
          roomId,
          title.trim(),
          type,
          description.trim(),
          isAnonymous ? 1 : 0,
        ]
      );


      // =============================
      // ส่งผลกลับไป Frontend
      // =============================

      res.status(201).json({
        success: true,
        message: "ส่งเรื่องร้องเรียนเรียบร้อยแล้ว",
        complaintId: result.insertId,
      });

    } catch (error) {

      console.error(
        "Create Complaint Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "ไม่สามารถบันทึกเรื่องร้องเรียนได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Tenant Repairs API
// =================================

const attachRepairImages = async (repairs) => {
  if (!repairs.length) return repairs;
  const [images] = await db.query('SELECT id, repair_id FROM repair_images WHERE repair_id IN (?) ORDER BY id ASC', [repairs.map((repair) => repair.id)]);
  const grouped = new Map();
  for (const image of images) {
    const list = grouped.get(image.repair_id) || [];
    list.push({ id: image.id, url: `/api/repair-images/${image.id}` });
    grouped.set(image.repair_id, list);
  }
  return repairs.map((repair) => ({ ...repair, images: grouped.get(repair.id) || [] }));
};

const discardRepairUploadFiles = (files = []) => {
  for (const file of files) {
    if (file?.path && existsSync(file.path)) unlinkSync(file.path);
  }
};

// Multer's MIME type comes from the client request, so verify the actual bytes
// after upload as well. This keeps executable/non-image files out of storage.
const hasValidRepairImageSignature = (file) => {
  const bytes = readFileSync(file.path);
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return (file.mimetype === "image/jpeg" && isJpeg)
    || (file.mimetype === "image/png" && isPng)
    || (file.mimetype === "image/webp" && isWebp);
};

app.get('/api/repair-images/:imageId', authenticateToken, async (req, res) => {
  const imageId = Number(req.params.imageId);
  if (!Number.isInteger(imageId)) return res.status(400).json({ success: false, message: 'รหัสรูปภาพไม่ถูกต้อง' });
  try {
    const [rows] = await db.query(`SELECT ri.stored_name FROM repair_images ri JOIN repair rp ON rp.id = ri.repair_id
      WHERE ri.id = ? AND (? = 'admin' OR rp.tenant_id = ?)`, [imageId, req.user.role, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'ไม่พบรูปภาพหรือไม่มีสิทธิ์เข้าถึง' });
    return res.sendFile(join(repairImageDirectory, rows[0].stored_name));
  } catch (error) { console.error('Repair image read error:', error); return res.status(500).json({ success: false, message: 'ไม่สามารถเปิดรูปภาพได้' }); }
});

// ดึงประวัติการแจ้งซ่อมของลูกบ้าน
app.get(
  "/api/tenant/repairs",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      console.log("Repair history userId:", userId);

      const [repairs] = await db.query(
        `
        SELECT
          rp.id,
          rp.tenant_id,
          rp.room_id,
          rp.category,
          rp.description,
          rp.urgency,
          rp.image_url,
          rp.status,
          rp.admin_note,
          rp.created_at,
          rp.updated_at,
          r.room_number

        FROM repair rp

        LEFT JOIN rooms r
          ON r.id = rp.room_id

        WHERE rp.tenant_id = ?

        ORDER BY
          rp.created_at DESC,
          rp.id DESC
        `,
        [userId]
      );

      console.log("Repair history:", repairs);

      const data = await attachRepairImages(repairs);
      res.json({
        success: true,
        data,
      });

    } catch (error) {
      console.error(
        "Tenant Repairs Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "ไม่สามารถดึงประวัติการแจ้งซ่อมได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Create Tenant Repair
// =================================

// สร้างรายการแจ้งซ่อมใหม่
app.post(
  "/api/tenant/repairs",
  authenticateToken,
  repairImageUpload.array("images", 5),
  async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    let connection;
    try {
      const userId = req.user.id;

      const {
        category,
        description,
        urgency,
      } = req.body;

      // -----------------------------
      // ตรวจสอบข้อมูล
      // -----------------------------

      if (!category || !description) {
        discardRepairUploadFiles(files);
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลให้ครบ",
        });
      }

      if (!files.every(hasValidRepairImageSignature)) {
        discardRepairUploadFiles(files);
        return res.status(400).json({
          success: false,
          message: "ไฟล์รูปภาพไม่ถูกต้อง รองรับเฉพาะ JPG, JPEG, PNG และ WEBP",
        });
      }

      // -----------------------------
      // หาห้องของลูกบ้าน
      // -----------------------------

      const [rooms] = await db.query(
        `
        SELECT
          r.id AS room_id
        FROM contracts c

        INNER JOIN rooms r
          ON r.id = c.room_id

        WHERE c.tenant_id = ?
          AND c.status = 'active'
          AND CURDATE() BETWEEN DATE(c.start_date) AND DATE(c.end_date)

        LIMIT 1
        `,
        [userId]
      );

      if (rooms.length === 0) {
        discardRepairUploadFiles(files);
        return res.status(400).json({
          success: false,
          message: "คุณยังไม่มีห้องพัก",
        });
      }

      const roomId = rooms[0].room_id;

      // -----------------------------
      // บันทึกแจ้งซ่อม
      // -----------------------------

      connection = await db.getConnection();
      await connection.beginTransaction();
      const [result] = await connection.query(
        `
        INSERT INTO repair
        (
          tenant_id,
          room_id,
          category,
          description,
          urgency,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'pending')
        `,
        [
          userId,
          roomId,
          category.trim(),
          description.trim(),
          urgency || "ทั่วไป",
        ]
      );

      if (files.length) {
        await connection.query(`INSERT INTO repair_images (repair_id, stored_name, original_name, mime_type, file_size) VALUES ?`, [files.map((file) => [result.insertId, file.filename, file.originalname, file.mimetype, file.size])]);
      }
      await connection.commit();

      console.log("Created repair:", {
        repairId: result.insertId,
        imageCount: files.length,
        tenantId: userId,
        roomId,
        category,
      });

      // -----------------------------
      // ส่งผลกลับ Frontend
      // -----------------------------

      res.status(201).json({
        success: true,
        message: "ส่งเรื่องแจ้งซ่อมเรียบร้อยแล้ว",
        repairId: result.insertId,
      });

    } catch (error) {
      if (connection) await connection.rollback();
      discardRepairUploadFiles(files);
      console.error(
        "Create Repair Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "ไม่สามารถบันทึกเรื่องแจ้งซ่อมได้",
        error: error.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }
);

// =================================
// Admin Repairs API
// =================================

// ดึงรายการแจ้งซ่อมทั้งหมด
app.get(
  "/api/admin/repairs",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ดูรายการแจ้งซ่อมทั้งหมด" });
      }
      const [repairs] = await db.query(`
        SELECT
          rp.id,
          rp.tenant_id,
          rp.room_id,
          rp.category,
          rp.description,
          rp.urgency,
          rp.image_url,
          rp.status,
          rp.admin_note,
          rp.created_at,
          rp.updated_at,
          r.room_number,
          u.username,
          u.full_name AS tenant_name
        FROM repair rp
        LEFT JOIN rooms r
          ON r.id = rp.room_id
        LEFT JOIN users u
          ON u.id = rp.tenant_id
        ORDER BY rp.created_at DESC, rp.id DESC
      `);

      const data = await attachRepairImages(repairs);
      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Admin Repairs Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถดึงรายการแจ้งซ่อมได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Admin Update Repair Status
// =================================

app.patch(
  "/api/admin/repairs/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "ไม่มีสิทธิ์ปรับสถานะแจ้งซ่อม" });
      }
      const repairId = req.params.id;
      const { status } = req.body;

      const allowedStatus = [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ];

      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "สถานะไม่ถูกต้อง",
        });
      }

      const [[repair]] = await db.query('SELECT tenant_id, category FROM repair WHERE id = ?', [repairId]);

      const [result] = await db.query(
        `
        UPDATE repair
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [status, repairId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบรายการแจ้งซ่อม",
        });
      }

      const repairText = ({ pending: 'เจ้าหน้าที่รับเรื่องแจ้งซ่อมแล้ว', in_progress: 'รายการแจ้งซ่อมกำลังดำเนินการ', completed: 'ซ่อมแซมเสร็จสิ้นแล้ว', cancelled: 'รายการแจ้งซ่อมถูกยกเลิก' })[status];
      await createNotification(repair?.tenant_id, 'repair', repairText, repair?.category || 'แจ้งซ่อม', Number(repairId), '/user/repair', `repair-status:${repairId}:${status}`);

      res.json({
        success: true,
        message: "อัปเดตสถานะเรียบร้อยแล้ว",
      });

    } catch (error) {
      console.error("Update Repair Status Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถอัปเดตสถานะได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Announcement API
// =================================

// ตรวจสอบว่าเป็น Admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "ไม่มีสิทธิ์จัดการประกาศ",
    });
  }

  next();
};


// =================================
// ดึงประกาศทั้งหมด
// Admin + Tenant ใช้ได้
// =================================

app.get(
  "/api/announcements",
  authenticateToken,
  async (req, res) => {
    try {
      const [announcements] = await db.query(`
        SELECT
          a.id,
          a.title,
          a.category,
          a.content,
          a.created_by,
          a.created_at,
          a.updated_at,
          u.full_name AS created_by_name
        FROM announcements a
        LEFT JOIN users u
          ON u.id = a.created_by
        ORDER BY a.created_at DESC, a.id DESC
      `);

      res.json({
        success: true,
        data: announcements,
      });

    } catch (error) {
      console.error("Get Announcements Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถดึงข้อมูลประกาศได้",
        error: error.message,
      });
    }
  }
);


// =================================
// สร้างประกาศ
// Admin เท่านั้น
// =================================

app.post(
  "/api/announcements",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        title,
        category,
        content,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกหัวข้อและรายละเอียดประกาศ",
        });
      }

      const allowedCategories = [
        "ประกาศทั่วไป",
        "ค่าใช้จ่าย",
        "กิจกรรม",
        "ความปลอดภัย",
      ];

      if (
        category &&
        !allowedCategories.includes(category)
      ) {
        return res.status(400).json({
          success: false,
          message: "หมวดหมู่ประกาศไม่ถูกต้อง",
        });
      }

      const [result] = await db.query(
        `
        INSERT INTO announcements
        (
          title,
          category,
          content,
          created_by
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          title.trim(),
          category || "ประกาศทั่วไป",
          content.trim(),
          req.user.id,
        ]
      );

      const [rows] = await db.query(
        `
        SELECT
          a.id,
          a.title,
          a.category,
          a.content,
          a.created_by,
          a.created_at,
          a.updated_at,
          u.full_name AS created_by_name
        FROM announcements a
        LEFT JOIN users u
          ON u.id = a.created_by
        WHERE a.id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      const [tenants] = await db.query("SELECT DISTINCT tenant_id FROM contracts WHERE status = 'active'");
      await Promise.all(tenants.map((tenant) => createNotification(tenant.tenant_id, 'announcement', title.trim(), content.trim().slice(0, 180), result.insertId, '/user/announcement', `announcement:${result.insertId}`)));

      res.status(201).json({
        success: true,
        message: "เผยแพร่ประกาศเรียบร้อยแล้ว",
        data: rows[0],
      });

    } catch (error) {
      console.error("Create Announcement Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถสร้างประกาศได้",
        error: error.message,
      });
    }
  }
);


// =================================
// ลบประกาศ
// Admin เท่านั้น
// =================================

app.delete(
  "/api/announcements/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "ID ประกาศไม่ถูกต้อง",
        });
      }

      const [existing] = await db.query(
        `
        SELECT id
        FROM announcements
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "ไม่พบประกาศนี้",
        });
      }

      await db.query(
        `
        DELETE FROM announcements
        WHERE id = ?
        `,
        [id]
      );

      res.json({
        success: true,
        message: "ลบประกาศเรียบร้อยแล้ว",
      });

    } catch (error) {
      console.error("Delete Announcement Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถลบประกาศได้",
        error: error.message,
      });
    }
  }
);

// =================================
// Parcel API
// =================================

// Create the parcel storage on first server start.  Existing installations
// do not have a SQL migration folder, so this keeps the parcel API usable
// without a manual database step.
let parcelTableReady;

const ensureParcelTable = () => {
  if (!parcelTableReady) {
    parcelTableReady = db.query(`
  CREATE TABLE IF NOT EXISTS parcels (
    id INT NOT NULL AUTO_INCREMENT,
    tenant_id INT NOT NULL,
    room_id INT NOT NULL,
    tracking_number VARCHAR(120) NOT NULL,
    sender VARCHAR(150) NOT NULL,
    parcel_type VARCHAR(100) NOT NULL DEFAULT 'พัสดุทั่วไป',
    description TEXT NULL,
    status ENUM('pending', 'received') NOT NULL DEFAULT 'pending',
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP NULL DEFAULT NULL,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_parcels_status (status),
    KEY idx_parcels_tenant (tenant_id),
    KEY idx_parcels_room (room_id),
    CONSTRAINT fk_parcels_tenant FOREIGN KEY (tenant_id) REFERENCES users(id),
    CONSTRAINT fk_parcels_room FOREIGN KEY (room_id) REFERENCES rooms(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  return parcelTableReady;
};

// =================================
// Admin: ดูพัสดุทั้งหมด
// =================================

app.get(
  "/api/parcels",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureParcelTable();

      const [rows] = await db.query(`
        SELECT
          p.id,
          p.tenant_id,
          p.room_id,

          r.room_number,

          u.full_name AS recipient,

          p.tracking_number,
          p.sender,
          p.parcel_type,
          p.description,

          p.received_at,
          p.picked_up_at,

          p.status,
          p.note,

          p.created_at,
          p.updated_at

        FROM parcels p

        INNER JOIN users u
          ON u.id = p.tenant_id

        INNER JOIN rooms r
          ON r.id = p.room_id

        ORDER BY p.received_at DESC, p.id DESC
      `);

      res.json({
        success: true,
        data: rows,
      });

    } catch (error) {
      console.error("GET /api/parcels ERROR:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถโหลดข้อมูลพัสดุได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Admin: เพิ่มพัสดุ
// =================================

app.post(
  "/api/parcels",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      await ensureParcelTable();

      const {
        room,
        trackingNumber,
        sender,
        parcelType,
        description,
        note,
      } = req.body;


      // -----------------------------
      // ตรวจข้อมูล
      // -----------------------------

      if (
        !room ||
        !trackingNumber ||
        !sender
      ) {
        return res.status(400).json({
          success: false,
          message:
            "กรุณากรอกห้อง เลขพัสดุ และผู้ส่ง",
        });
      }


      // -----------------------------
      // หาผู้พักจากเลขห้อง
      // -----------------------------

      const [contracts] = await db.query(
        `
        SELECT
          c.tenant_id,
          c.room_id,
          r.room_number,
          u.full_name AS recipient

        FROM contracts c

        INNER JOIN rooms r
          ON r.id = c.room_id

        INNER JOIN users u
          ON u.id = c.tenant_id

        WHERE r.room_number = ?
          AND c.status = 'active'
          AND u.role = 'tenant'

        ORDER BY c.id DESC

        LIMIT 1
        `,
        [String(room).trim()]
      );


      if (contracts.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "ไม่พบผู้พักที่มีสัญญาอยู่ในห้องนี้",
        });
      }


      const tenant = contracts[0];


      // -----------------------------
      // บันทึกพัสดุ
      // -----------------------------

      const [result] = await db.query(
        `
        INSERT INTO parcels
        (
          tenant_id,
          room_id,
          tracking_number,
          sender,
          parcel_type,
          description,
          status,
          note
        )

        VALUES
        (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'pending',
          ?
        )
        `,
        [
          tenant.tenant_id,
          tenant.room_id,

          String(trackingNumber).trim(),
          String(sender).trim(),

          parcelType
            ? String(parcelType).trim()
            : "พัสดุทั่วไป",

          description
            ? String(description).trim()
            : null,

          note
            ? String(note).trim()
            : null,
        ]
      );

      await createNotification(tenant.tenant_id, 'parcel', 'มีพัสดุใหม่มาถึง', `พัสดุจาก ${String(sender).trim()} เลขติดตาม ${String(trackingNumber).trim()}`, result.insertId, '/user/parcel', `parcel-arrived:${result.insertId}`);


      // -----------------------------
      // ดึงข้อมูลที่เพิ่งสร้าง
      // -----------------------------

      const [rows] = await db.query(
        `
        SELECT
          p.id,
          p.tenant_id,
          p.room_id,

          r.room_number,

          u.full_name AS recipient,

          p.tracking_number,
          p.sender,
          p.parcel_type,
          p.description,

          p.received_at,
          p.picked_up_at,

          p.status,
          p.note,

          p.created_at,
          p.updated_at

        FROM parcels p

        INNER JOIN users u
          ON u.id = p.tenant_id

        INNER JOIN rooms r
          ON r.id = p.room_id

        WHERE p.id = ?

        LIMIT 1
        `,
        [result.insertId]
      );


      res.status(201).json({
        success: true,
        message: "บันทึกพัสดุเรียบร้อย",
        data: rows[0],
      });

    } catch (error) {
      console.error("POST /api/parcels ERROR:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถบันทึกพัสดุได้",
        error: error.message,
      });
    }
  }
);


// =================================
// เปลี่ยนสถานะพัสดุ
// Admin / เจ้าของพัสดุ
// =================================

app.patch(
  "/api/parcels/:id/status",
  authenticateToken,
  async (req, res) => {
    try {
      await ensureParcelTable();


      const { id } = req.params;
      const { status } = req.body;


      if (!/^\d+$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "รหัสพัสดุไม่ถูกต้อง",
        });
      }


      if (
        !["pending", "received"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "สถานะไม่ถูกต้อง",
        });
      }


      // =================================
      // Admin
      // =================================

      if (req.user.role === "admin") {

        const [result] = await db.query(
          `
          UPDATE parcels

          SET
            status = ?,

            picked_up_at =
              CASE
                WHEN ? = 'received'
                THEN CURRENT_TIMESTAMP
                ELSE NULL
              END

          WHERE id = ?
          `,
          [
            status,
            status,
            id,
          ]
        );


        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "ไม่พบพัสดุ",
          });
        }

      }

      // =================================
      // Tenant
      // แก้ได้เฉพาะพัสดุของตัวเอง
      // =================================

      else {

        // ลูกบ้านสามารถยืนยันรับแล้วได้
        // แต่ไม่สามารถเปลี่ยนของคนอื่น

        if (status !== "received") {
          return res.status(403).json({
            success: false,
            message:
              "ลูกบ้านสามารถยืนยันรับพัสดุแล้วได้เท่านั้น",
          });
        }


        const [result] = await db.query(
          `
          UPDATE parcels

          SET
            status = 'received',
            picked_up_at = CURRENT_TIMESTAMP

          WHERE id = ?
            AND tenant_id = ?
            AND status = 'pending'
          `,
          [
            id,
            req.user.id,
          ]
        );


        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message:
              "ไม่พบพัสดุนี้ หรือพัสดุนี้ไม่ใช่ของคุณ",
          });
        }

      }


      res.json({
        success: true,
        message:
          status === "received"
            ? "ยืนยันรับพัสดุเรียบร้อย"
            : "อัปเดตสถานะพัสดุเรียบร้อย",
      });

    } catch (error) {

      console.error(
        "PATCH /api/parcels/:id/status ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "ไม่สามารถอัปเดตสถานะพัสดุได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Tenant: ดูเฉพาะพัสดุของตัวเอง
// =================================

app.get(
  "/api/tenant/parcels",
  authenticateToken,
  async (req, res) => {
    try {
      await ensureParcelTable();


      const [rows] = await db.query(
        `
        SELECT
          p.id,

          p.room_id,
          r.room_number,

          p.tracking_number,
          p.sender,
          p.parcel_type,
          p.description,

          p.received_at,
          p.picked_up_at,

          p.status,
          p.note,

          p.created_at,
          p.updated_at

        FROM parcels p

        INNER JOIN rooms r
          ON r.id = p.room_id

        WHERE p.tenant_id = ?

        ORDER BY p.received_at DESC, p.id DESC
        `,
        [req.user.id]
      );


      res.json({
        success: true,
        data: rows,
      });

    } catch (error) {

      console.error(
        "GET /api/tenant/parcels ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "ไม่สามารถโหลดพัสดุของคุณได้",
        error: error.message,
      });
    }
  }
);


// =================================
// Utility billing API
// =================================

const isBillingPeriod = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
const billingNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

const utilityRoomsQuery = `
  SELECT r.id AS room_id, r.room_number, COALESCE(c.monthly_rent, r.monthly_rent) AS rent_amount,
    c.id AS contract_id, c.tenant_id, u.full_name AS tenant_name,
    ur.id AS reading_id, ur.water_previous, ur.water_current, ur.water_units, ur.water_rate, ur.water_amount,
    ur.electric_previous, ur.electric_current, ur.electric_units, ur.electric_rate, ur.electric_amount,
    ur.common_fee, ur.total_amount, ui.id AS invoice_id
  FROM rooms r
  LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
    AND CURDATE() BETWEEN DATE(c.start_date) AND DATE(c.end_date)
  LEFT JOIN users u ON u.id = c.tenant_id
  LEFT JOIN utility_readings ur ON ur.room_id = r.id AND ur.billing_period = ?
  LEFT JOIN utility_invoices ui ON ui.room_id = r.id AND ui.billing_period = ?
  ORDER BY r.floor, r.room_number`;

const testRunId = (value) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const utilityTestRoomsQuery = `
  SELECT r.id AS room_id, r.room_number, COALESCE(c.monthly_rent, r.monthly_rent) AS rent_amount,
    c.id AS contract_id, c.tenant_id, u.full_name AS tenant_name,
    tr.id AS reading_id, tr.water_previous, tr.water_current, tr.water_units, tr.water_rate, tr.water_amount,
    tr.electric_previous, tr.electric_current, tr.electric_units, tr.electric_rate, tr.electric_amount,
    tr.common_fee, tr.total_amount, ti.id AS invoice_id
  FROM rooms r
  LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active'
  LEFT JOIN users u ON u.id = c.tenant_id
  LEFT JOIN utility_test_readings tr ON tr.room_id = r.id AND tr.test_run_id = ?
  LEFT JOIN utility_test_invoices ti ON ti.reading_id = tr.id
  ORDER BY r.floor, r.room_number`;

app.get('/api/admin/utility/:period/test-runs', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params;
  if (!isBillingPeriod(period)) return res.status(400).json({ success: false, message: 'รอบบิลไม่ถูกต้อง' });
  try {
    const [runs] = await db.query(`SELECT tr.id, tr.billing_period, tr.version, tr.created_at, COUNT(ti.id) invoice_count
      FROM utility_test_runs tr LEFT JOIN utility_test_invoices ti ON ti.test_run_id = tr.id
      WHERE tr.billing_period = ? GROUP BY tr.id ORDER BY tr.version DESC`, [period]);
    res.json({ success: true, data: runs });
  } catch (error) { console.error('Load utility test runs error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถโหลดประวัติการทดสอบได้' }); }
});

app.post('/api/admin/utility/:period/test-runs', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params;
  const waterRate = billingNumber(req.body?.waterRate); const electricRate = billingNumber(req.body?.electricRate); const commonFee = billingNumber(req.body?.commonFee);
  if (!isBillingPeriod(period) || [waterRate, electricRate, commonFee].some((value) => value === null)) return res.status(400).json({ success: false, message: 'กรุณาระบุอัตราค่าน้ำ ค่าไฟ และค่าส่วนกลางก่อนเริ่มรอบทดสอบ' });
  try {
    const [[latest]] = await db.query('SELECT COALESCE(MAX(version), 0) version FROM utility_test_runs WHERE billing_period = ?', [period]);
    const [result] = await db.query(`INSERT INTO utility_test_runs (billing_period, version, water_rate, electric_rate, common_fee, created_by)
      VALUES (?, ?, ?, ?, ?, ?)`, [period, Number(latest.version) + 1, waterRate, electricRate, commonFee, req.user.id]);
    res.status(201).json({ success: true, data: { id: result.insertId, version: Number(latest.version) + 1 }, message: 'สร้างรอบทดสอบเรียบร้อยแล้ว' });
  } catch (error) { console.error('Create utility test run error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถสร้างรอบทดสอบได้' }); }
});

app.delete('/api/admin/utility/:period/test-runs/:runId', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params; const runId = testRunId(req.params.runId);
  if (!isBillingPeriod(period) || !runId) return res.status(400).json({ success: false, message: 'ข้อมูลรอบทดสอบไม่ถูกต้อง' });
  try {
    const [result] = await db.query('DELETE FROM utility_test_runs WHERE id = ? AND billing_period = ?', [runId, period]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบรอบทดสอบ' });
    res.json({ success: true, message: 'ลบข้อมูลทดสอบเรียบร้อยแล้ว' });
  } catch (error) { console.error('Delete utility test run error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถลบข้อมูลทดสอบได้' }); }
});

app.get('/api/admin/utility/:period/test-runs/:runId', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params; const runId = testRunId(req.params.runId);
  if (!isBillingPeriod(period) || !runId) return res.status(400).json({ success: false, message: 'ข้อมูลรอบทดสอบไม่ถูกต้อง' });
  try {
    const [[rate]] = await db.query('SELECT * FROM utility_test_runs WHERE id = ? AND billing_period = ?', [runId, period]);
    if (!rate) return res.status(404).json({ success: false, message: 'ไม่พบรอบทดสอบ' });
    const [rooms] = await db.query(utilityTestRoomsQuery, [runId]);
    const result = await Promise.all(rooms.map(async (room) => {
      if (room.reading_id) return room;
      const [[previous]] = await db.query(`SELECT water_current, electric_current FROM utility_readings WHERE room_id = ? AND billing_period < ? ORDER BY billing_period DESC LIMIT 1`, [room.room_id, period]);
      return { ...room, water_previous: previous?.water_current ?? null, electric_previous: previous?.electric_current ?? null };
    }));
    res.json({ success: true, data: { rate, rooms: result, testRun: { id: rate.id, version: rate.version } } });
  } catch (error) { console.error('Load utility test billing error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถโหลดข้อมูลทดสอบได้' }); }
});

app.put('/api/admin/utility/:period/test-runs/:runId/rates', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params; const runId = testRunId(req.params.runId);
  const waterRate = billingNumber(req.body?.waterRate); const electricRate = billingNumber(req.body?.electricRate); const commonFee = billingNumber(req.body?.commonFee);
  if (!isBillingPeriod(period) || !runId || [waterRate, electricRate, commonFee].some((value) => value === null)) return res.status(400).json({ success: false, message: 'ข้อมูลอัตราค่าใช้จ่ายไม่ถูกต้อง' });
  try {
    const [[reading]] = await db.query('SELECT id FROM utility_test_readings WHERE test_run_id = ? LIMIT 1', [runId]);
    if (reading) return res.status(409).json({ success: false, message: 'มีข้อมูลมิเตอร์ทดสอบแล้ว จึงไม่สามารถเปลี่ยนอัตราได้' });
    const [result] = await db.query('UPDATE utility_test_runs SET water_rate = ?, electric_rate = ?, common_fee = ? WHERE id = ? AND billing_period = ?', [waterRate, electricRate, commonFee, runId, period]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'ไม่พบรอบทดสอบ' });
    res.json({ success: true, message: 'บันทึกอัตราสำหรับรอบทดสอบแล้ว' });
  } catch (error) { console.error('Save utility test rates error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกอัตราทดสอบได้' }); }
});

app.put('/api/admin/utility/:period/test-runs/:runId/readings', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params; const runId = testRunId(req.params.runId); const readings = Array.isArray(req.body.readings) ? req.body.readings : [];
  if (!isBillingPeriod(period) || !runId || !readings.length) return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลมิเตอร์สำหรับบันทึก' });
  const connection = await db.getConnection();
  try {
    const [[rate]] = await connection.query('SELECT * FROM utility_test_runs WHERE id = ? AND billing_period = ? FOR UPDATE', [runId, period]);
    if (!rate) return res.status(404).json({ success: false, message: 'ไม่พบรอบทดสอบ' });
    const prepared = [];
    for (const item of readings) {
      const roomId = Number(item.roomId); const wp = billingNumber(item.waterPrevious); const wc = billingNumber(item.waterCurrent); const ep = billingNumber(item.electricPrevious); const ec = billingNumber(item.electricCurrent);
      if (!Number.isInteger(roomId) || [wp, wc, ep, ec].some((value) => value === null) || wc < wp || ec < ep) return res.status(400).json({ success: false, message: `ข้อมูลมิเตอร์ห้อง ${item.roomNumber || roomId} ไม่ถูกต้อง` });
      const [[room]] = await connection.query(`SELECT r.id, COALESCE(c.monthly_rent, r.monthly_rent) monthly_rent FROM rooms r
        LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active' WHERE r.id = ?`, [roomId]);
      if (!room) return res.status(404).json({ success: false, message: 'ไม่พบห้องพัก' });
      const [[issued]] = await connection.query(`SELECT ti.id FROM utility_test_readings tr
        JOIN utility_test_invoices ti ON ti.reading_id = tr.id WHERE tr.test_run_id = ? AND tr.room_id = ?`, [runId, roomId]);
      if (issued) return res.status(409).json({ success: false, message: `ห้อง ${item.roomNumber || roomId} ออกใบแจ้งหนี้ทดสอบแล้ว จึงแก้ไขมิเตอร์ไม่ได้` });
      const waterUnits = wc - wp; const electricUnits = ec - ep; const waterAmount = waterUnits * Number(rate.water_rate); const electricAmount = electricUnits * Number(rate.electric_rate);
      prepared.push([runId, roomId, room.monthly_rent, wp, wc, waterUnits, rate.water_rate, waterAmount, ep, ec, electricUnits, rate.electric_rate, electricAmount, rate.common_fee, Number(room.monthly_rent) + waterAmount + electricAmount + Number(rate.common_fee)]);
    }
    await connection.beginTransaction();
    for (const row of prepared) await connection.query(`INSERT INTO utility_test_readings (test_run_id,room_id,rent_amount,water_previous,water_current,water_units,water_rate,water_amount,electric_previous,electric_current,electric_units,electric_rate,electric_amount,common_fee,total_amount)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE rent_amount=VALUES(rent_amount),water_previous=VALUES(water_previous),water_current=VALUES(water_current),water_units=VALUES(water_units),water_rate=VALUES(water_rate),water_amount=VALUES(water_amount),electric_previous=VALUES(electric_previous),electric_current=VALUES(electric_current),electric_units=VALUES(electric_units),electric_rate=VALUES(electric_rate),electric_amount=VALUES(electric_amount),common_fee=VALUES(common_fee),total_amount=VALUES(total_amount)`, row);
    await connection.commit(); res.json({ success: true, saved: prepared.length, message: `บันทึกข้อมูลทดสอบสำเร็จ ${prepared.length} ห้อง` });
  } catch (error) { await connection.rollback(); console.error('Save utility test readings error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกข้อมูลทดสอบได้' }); } finally { connection.release(); }
});

app.post('/api/admin/utility/:period/test-runs/:runId/invoices', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params; const runId = testRunId(req.params.runId); const roomId = req.body?.roomId ? Number(req.body.roomId) : null;
  if (!isBillingPeriod(period) || !runId || (roomId !== null && !Number.isInteger(roomId))) return res.status(400).json({ success: false, message: 'ข้อมูลใบแจ้งหนี้ทดสอบไม่ถูกต้อง' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`SELECT tr.id reading_id, tr.room_id, c.id contract_id, c.tenant_id, ti.id invoice_id FROM utility_test_readings tr
      LEFT JOIN contracts c ON c.room_id = tr.room_id AND c.status = 'active'
      LEFT JOIN utility_test_invoices ti ON ti.reading_id = tr.id WHERE tr.test_run_id = ? AND (? IS NULL OR tr.room_id = ?) FOR UPDATE`, [runId, roomId, roomId]);
    if (roomId && !rows.length) { await connection.rollback(); return res.status(400).json({ success: false, message: 'ยังไม่ได้บันทึกมิเตอร์ทดสอบของห้องนี้' }); }
    let issued = 0; for (const row of rows) { if (row.invoice_id) continue; await connection.query('INSERT INTO utility_test_invoices (test_run_id, reading_id, room_id, tenant_id, contract_id, due_date) VALUES (?, ?, ?, ?, ?, ?)', [runId, row.reading_id, row.room_id, row.tenant_id, row.contract_id, `${period}-10`]); issued += 1; }
    await connection.commit(); res.json({ success: true, issued, message: `ออกใบแจ้งหนี้ทดสอบสำเร็จ ${issued} ห้อง (ไม่ส่งให้ผู้เช่า)` });
  } catch (error) { await connection.rollback(); console.error('Issue utility test invoices error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถออกใบแจ้งหนี้ทดสอบได้' }); } finally { connection.release(); }
});

app.get('/api/admin/utility/:period', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params;
  if (!isBillingPeriod(period)) return res.status(400).json({ success: false, message: 'รอบบิลไม่ถูกต้อง' });
  try {
    const [[rate]] = await db.query('SELECT * FROM utility_rate_periods WHERE billing_period = ?', [period]);
    const [rooms] = await db.query(utilityRoomsQuery, [period, period]);
    const result = await Promise.all(rooms.map(async (room) => {
      if (room.reading_id) return room;
      const [[previous]] = await db.query(`SELECT water_current, electric_current FROM utility_readings
        WHERE room_id = ? AND billing_period < ? ORDER BY billing_period DESC LIMIT 1`, [room.room_id, period]);
      return { ...room, water_previous: previous?.water_current ?? null, electric_previous: previous?.electric_current ?? null };
    }));
    res.json({ success: true, data: { rate: rate || null, rooms: result } });
  } catch (error) {
    console.error('Load utility billing error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถโหลดข้อมูลค่าน้ำค่าไฟได้' });
  }
});

app.put('/api/admin/utility/:period/rates', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params;
  const waterRate = billingNumber(req.body.waterRate);
  const electricRate = billingNumber(req.body.electricRate);
  const commonFee = billingNumber(req.body.commonFee);
  if (!isBillingPeriod(period) || [waterRate, electricRate, commonFee].some((n) => n === null)) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุรอบบิลและอัตราค่าใช้จ่ายที่ถูกต้อง' });
  }
  try {
    const [[reading]] = await db.query('SELECT id FROM utility_readings WHERE billing_period = ? LIMIT 1', [period]);
    if (reading) return res.status(409).json({ success: false, message: 'มีการบันทึกมิเตอร์รอบนี้แล้ว จึงไม่สามารถเปลี่ยนอัตราได้' });
    await db.query(`INSERT INTO utility_rate_periods (billing_period, water_rate, electric_rate, common_fee, created_by)
      VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE water_rate = VALUES(water_rate), electric_rate = VALUES(electric_rate), common_fee = VALUES(common_fee), created_by = VALUES(created_by)`,
      [period, waterRate, electricRate, commonFee, req.user.id]);
    res.json({ success: true, message: 'บันทึกการตั้งค่าทุกรอบห้องเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Save utility rates error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกการตั้งค่าได้' });
  }
});

app.put('/api/admin/utility/:period/readings', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params;
  const readings = Array.isArray(req.body.readings) ? req.body.readings : [];
  if (!isBillingPeriod(period) || readings.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลมิเตอร์สำหรับบันทึก' });
  const connection = await db.getConnection();
  try {
    const [[rate]] = await connection.query('SELECT * FROM utility_rate_periods WHERE billing_period = ? FOR UPDATE', [period]);
    if (!rate) return res.status(400).json({ success: false, message: 'กรุณาบันทึกอัตราค่าน้ำ ค่าไฟ และค่าส่วนกลางก่อน' });
    const errors = [];
    const prepared = [];
    for (const item of readings) {
      const roomId = Number(item.roomId); const waterPrevious = billingNumber(item.waterPrevious); const waterCurrent = billingNumber(item.waterCurrent);
      const electricPrevious = billingNumber(item.electricPrevious); const electricCurrent = billingNumber(item.electricCurrent);
      if (!Number.isInteger(roomId) || [waterPrevious, waterCurrent, electricPrevious, electricCurrent].some((n) => n === null) || waterCurrent < waterPrevious || electricCurrent < electricPrevious) {
        errors.push({ roomId: item.roomId, roomNumber: item.roomNumber, message: 'เลขมิเตอร์หลังต้องไม่น้อยกว่าเลขมิเตอร์ก่อน และต้องกรอกให้ครบ' });
        continue;
      }
      const [[room]] = await connection.query(`SELECT r.id, COALESCE(c.monthly_rent, r.monthly_rent) rent_amount
        FROM rooms r LEFT JOIN contracts c ON c.room_id = r.id AND c.status = 'active' WHERE r.id = ?`, [roomId]);
      if (!room) { errors.push({ roomId, message: 'ไม่พบห้องพัก' }); continue; }
      const [[invoice]] = await connection.query('SELECT id FROM utility_invoices WHERE room_id = ? AND billing_period = ?', [roomId, period]);
      if (invoice) { errors.push({ roomId, roomNumber: item.roomNumber, message: 'ออกใบแจ้งหนี้แล้ว จึงแก้ไขมิเตอร์ไม่ได้' }); continue; }
      const waterUnits = waterCurrent - waterPrevious; const electricUnits = electricCurrent - electricPrevious;
      const waterAmount = waterUnits * Number(rate.water_rate); const electricAmount = electricUnits * Number(rate.electric_rate);
      prepared.push([roomId, period, room.rent_amount, waterPrevious, waterCurrent, waterUnits, rate.water_rate, waterAmount, electricPrevious, electricCurrent, electricUnits, rate.electric_rate, electricAmount, rate.common_fee, Number(room.rent_amount) + waterAmount + electricAmount + Number(rate.common_fee)]);
    }
    if (errors.length) return res.status(400).json({ success: false, message: 'พบข้อมูลมิเตอร์ที่ไม่ถูกต้อง', errors });
    await connection.beginTransaction();
    for (const row of prepared) await connection.query(`INSERT INTO utility_readings
      (room_id,billing_period,rent_amount,water_previous,water_current,water_units,water_rate,water_amount,electric_previous,electric_current,electric_units,electric_rate,electric_amount,common_fee,total_amount)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE rent_amount=VALUES(rent_amount),water_previous=VALUES(water_previous),water_current=VALUES(water_current),water_units=VALUES(water_units),water_rate=VALUES(water_rate),water_amount=VALUES(water_amount),electric_previous=VALUES(electric_previous),electric_current=VALUES(electric_current),electric_units=VALUES(electric_units),electric_rate=VALUES(electric_rate),electric_amount=VALUES(electric_amount),common_fee=VALUES(common_fee),total_amount=VALUES(total_amount)`, row);
    await connection.commit();
    res.json({ success: true, message: `บันทึกมิเตอร์สำเร็จ ${prepared.length} ห้อง`, saved: prepared.length });
  } catch (error) {
    await connection.rollback(); console.error('Save utility readings error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกมิเตอร์ได้' });
  } finally { connection.release(); }
});

app.post('/api/admin/utility/:period/invoices', authenticateToken, requireAdmin, async (req, res) => {
  const { period } = req.params;
  const roomId = req.body?.roomId ? Number(req.body.roomId) : null;
  if (!isBillingPeriod(period)) return res.status(400).json({ success: false, message: 'รอบบิลไม่ถูกต้อง' });
  if (roomId !== null && !Number.isInteger(roomId)) return res.status(400).json({ success: false, message: 'ห้องพักไม่ถูกต้อง' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`SELECT ur.*, c.id contract_id, c.tenant_id, ui.id invoice_id
      FROM utility_readings ur JOIN contracts c ON c.room_id = ur.room_id AND c.status = 'active'
        AND CURDATE() BETWEEN DATE(c.start_date) AND DATE(c.end_date)
      LEFT JOIN utility_invoices ui ON ui.room_id = ur.room_id AND ui.billing_period = ur.billing_period
      WHERE ur.billing_period = ? AND (? IS NULL OR ur.room_id = ?) FOR UPDATE`, [period, roomId, roomId]);
    const [missingReadings] = await connection.query(`SELECT r.id room_id, r.room_number FROM contracts c
      JOIN rooms r ON r.id = c.room_id LEFT JOIN utility_readings ur ON ur.room_id = r.id AND ur.billing_period = ?
      WHERE c.status = 'active' AND CURDATE() BETWEEN DATE(c.start_date) AND DATE(c.end_date) AND ur.id IS NULL
        AND (? IS NULL OR r.id = ?)`, [period, roomId, roomId]);
    if (roomId && !rows.length && !missingReadings.length) { await connection.rollback(); return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลของห้องที่เลือก' }); }
    const skipped = missingReadings.map((room) => ({ roomId: room.room_id, roomNumber: room.room_number, message: 'ยังไม่ได้บันทึกมิเตอร์' })); let issued = 0;
    const dueDate = `${period}-10`;
    for (const row of rows) {
      if (row.invoice_id) { skipped.push({ roomId: row.room_id, message: 'ออกใบแจ้งหนี้แล้ว' }); continue; }
      const [payment] = await connection.query(`INSERT INTO payments (contract_id, tenant_id, amount, due_date, status, note)
        VALUES (?, ?, ?, ?, 'pending', ?)`, [row.contract_id, row.tenant_id, row.total_amount, dueDate, `ค่าน้ำ ค่าไฟ และค่าเช่า รอบ ${period}`]);
      await connection.query(`INSERT INTO utility_invoices (reading_id, room_id, tenant_id, contract_id, payment_id, billing_period, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [row.id, row.room_id, row.tenant_id, row.contract_id, payment.insertId, period, dueDate]);
      await createNotification(row.tenant_id, 'invoice', `ใบแจ้งหนี้ประจำเดือน ${period}`, `มียอดชำระใหม่ กำหนดชำระ ${dueDate}`, payment.insertId, '/user/payment', `invoice-issued:${row.room_id}:${period}`, connection);
      issued += 1;
    }
    await connection.commit();
    const skippedRooms = skipped.map((item) => item.roomNumber || item.roomId).join(', ');
    res.json({ success: true, message: `ออกใบแจ้งหนี้สำเร็จ ${issued} ห้อง${skippedRooms ? ` (ยังไม่ออกบิล: ${skippedRooms})` : ''}`, issued, skipped });
  } catch (error) {
    await connection.rollback(); console.error('Issue utility invoices error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถออกใบแจ้งหนี้ได้' });
  } finally { connection.release(); }
});

app.get('/api/tenant/invoices', authenticateToken, async (req, res) => {
  try {
    const [invoices] = await db.query(`SELECT ui.id, ui.payment_id, ui.billing_period, ui.issued_at, ui.due_date, p.status, p.paid_date, p.slip_url, p.updated_at AS payment_updated_at,
      r.room_number, u.full_name tenant_name, ur.rent_amount, ur.water_previous, ur.water_current, ur.water_units, ur.water_rate, ur.water_amount,
      ur.electric_previous, ur.electric_current, ur.electric_units, ur.electric_rate, ur.electric_amount, ur.common_fee, ur.total_amount
      FROM utility_invoices ui JOIN utility_readings ur ON ur.id = ui.reading_id JOIN payments p ON p.id = ui.payment_id
      JOIN rooms r ON r.id = ui.room_id JOIN users u ON u.id = ui.tenant_id
      WHERE ui.tenant_id = ?
        AND ui.contract_id = (
          SELECT active_contract.id FROM contracts active_contract
          WHERE active_contract.tenant_id = ? AND active_contract.status = 'active'
            AND CURDATE() BETWEEN DATE(active_contract.start_date) AND DATE(active_contract.end_date)
          ORDER BY active_contract.start_date DESC, active_contract.id DESC LIMIT 1
        )
      ORDER BY ui.billing_period DESC`, [req.user.id, req.user.id]);
    // Issued invoices can become overdue without an admin action; creating this
    // idempotent notification while loading the tenant's real invoices covers it.
    for (const invoice of invoices) {
      const dueAt = new Date(`${invoice.due_date}T23:59:59`);
      const pendingInvoice = ['pending', 'overdue', 'rejected'].includes(invoice.status);
      if (pendingInvoice && dueAt > new Date() && dueAt - new Date() <= 3 * 24 * 60 * 60 * 1000) {
        await createNotification(req.user.id, 'invoice', 'ใบแจ้งหนี้ใกล้ครบกำหนด', `ใบแจ้งหนี้รอบ ${invoice.billing_period} ครบกำหนด ${invoice.due_date}`, invoice.payment_id, '/user/payment', `invoice-due-soon:${invoice.id}`);
      }
      if (pendingInvoice && dueAt < new Date()) {
        await createNotification(req.user.id, 'invoice', 'ใบแจ้งหนี้เกินกำหนดชำระ', `ใบแจ้งหนี้รอบ ${invoice.billing_period} ครบกำหนดแล้ว`, invoice.payment_id, '/user/payment', `invoice-overdue:${invoice.id}`);
      }
    }
    res.json({ success: true, data: invoices });
  } catch (error) { console.error('Tenant invoices error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถโหลดใบแจ้งหนี้ได้' }); }
});

// Payment settings deliberately return only administrator-configured banking data.
// The application never manufactures a QR code or recipient account.
app.get('/api/payment-settings', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT bank_name, account_name, account_number, qr_image_url, updated_at FROM payment_settings WHERE id = 1');
    // Temporary clearly-labelled data lets the payment flow be previewed until
    // an administrator saves the real recipient account and QR image.
    res.json({ success: true, data: rows[0] || {
      bank_name: 'ธนาคารทดสอบ', account_name: 'KPN Haven (ข้อมูลทดสอบ)',
      account_number: '000-0-00000-0', qr_image_url: '/uploads/demo-payment-qr.svg', is_demo: true,
    } });
  } catch (error) { console.error('Payment settings read error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถโหลดข้อมูลบัญชีรับเงินได้' }); }
});

app.put('/api/admin/payment-settings', authenticateToken, requireAdmin, async (req, res) => {
  const { bankName, accountName, accountNumber, qrImageUrl } = req.body || {};
  if (![bankName, accountName, accountNumber, qrImageUrl].every((value) => typeof value === 'string' && value.trim())) return res.status(400).json({ success: false, message: 'กรอกธนาคาร ชื่อบัญชี เลขบัญชี และ URL QR Code ให้ครบ' });
  try {
    await db.query(`INSERT INTO payment_settings (id, bank_name, account_name, account_number, qr_image_url) VALUES (1, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE bank_name = VALUES(bank_name), account_name = VALUES(account_name), account_number = VALUES(account_number), qr_image_url = VALUES(qr_image_url)`, [bankName.trim(), accountName.trim(), accountNumber.trim(), qrImageUrl.trim()]);
    res.json({ success: true, message: 'บันทึกข้อมูลรับชำระแล้ว' });
  } catch (error) { console.error('Payment settings update error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถบันทึกข้อมูลรับชำระได้' }); }
});

app.post('/api/tenant/payments/:paymentId/slip', authenticateToken, paymentSlipUpload.single('slip'), async (req, res) => {
  const paymentId = Number(req.params.paymentId);
  const discardSlip = () => { if (req.file && existsSync(req.file.path)) unlinkSync(req.file.path); };
  if (!Number.isInteger(paymentId) || paymentId < 1) return res.status(400).json({ success: false, message: 'เลขที่รายการชำระเงินไม่ถูกต้อง' });
  if (!req.file) return res.status(400).json({ success: false, message: 'กรุณาแนบสลิป JPG, JPEG, PNG หรือ WEBP ขนาดไม่เกิน 5 MB' });
  try {
    const [payments] = await db.query('SELECT id, status FROM payments WHERE id = ? AND tenant_id = ?', [paymentId, req.user.id]);
    if (!payments[0]) { discardSlip(); return res.status(404).json({ success: false, message: 'ไม่พบใบแจ้งหนี้ของคุณ' }); }
    if (payments[0].status === 'paid' || payments[0].status === 'reviewing') { discardSlip(); return res.status(409).json({ success: false, message: 'รายการนี้ชำระเงินหรือส่งหลักฐานแล้ว' }); }
    const slipUrl = `/uploads/payment-slips/${req.file.filename}`;
    await db.query("UPDATE payments SET slip_url = ?, status = 'reviewing', paid_date = NULL WHERE id = ?", [slipUrl, paymentId]);
    await createNotification(req.user.id, 'payment', 'อยู่ระหว่างตรวจสอบการชำระเงิน', 'เราได้รับหลักฐานการชำระเงินของคุณแล้ว', paymentId, '/user/payment', `payment-reviewing:${paymentId}`);
    res.status(201).json({ success: true, data: { paymentId, status: 'reviewing', slipUrl }, message: 'ส่งหลักฐานการชำระเงินแล้ว รอตรวจสอบ' });
  } catch (error) { discardSlip(); console.error('Payment slip upload error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถส่งหลักฐานการชำระเงินได้' }); }
});

// Test-only flow: tenant confirmation immediately marks their own invoice as paid.
app.post('/api/tenant/payments/:paymentId/confirm', authenticateToken, async (req, res) => {
  const paymentId = Number(req.params.paymentId);
  if (!Number.isInteger(paymentId) || paymentId < 1) return res.status(400).json({ success: false, message: 'เลขที่รายการชำระเงินไม่ถูกต้อง' });
  try {
    const [result] = await db.query(
      "UPDATE payments SET status = 'paid', paid_date = CURDATE() WHERE id = ? AND tenant_id = ? AND status IN ('pending', 'overdue', 'rejected')",
      [paymentId, req.user.id]
    );
    if (!result.affectedRows) return res.status(409).json({ success: false, message: 'รายการนี้ชำระเงินแล้วหรือไม่สามารถยืนยันได้' });
    res.json({ success: true, data: { paymentId, status: 'paid' }, message: 'ยืนยันการชำระเงินเรียบร้อย' });
  } catch (error) {
    console.error('Test payment confirmation error:', error);
    res.status(500).json({ success: false, message: 'ไม่สามารถยืนยันการชำระเงินได้' });
  }
});

app.get('/api/admin/payments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [payments] = await db.query(`SELECT p.id, p.amount, p.due_date, p.paid_date, p.status, p.slip_url, p.note, p.updated_at, r.room_number, u.full_name AS tenant_name, ui.billing_period
      FROM payments p JOIN contracts c ON c.id = p.contract_id JOIN rooms r ON r.id = c.room_id JOIN users u ON u.id = p.tenant_id
      LEFT JOIN utility_invoices ui ON ui.payment_id = p.id ORDER BY p.updated_at DESC`);
    res.json({ success: true, data: payments });
  } catch (error) { console.error('Admin payments read error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถโหลดรายการชำระเงินได้' }); }
});

app.patch('/api/admin/payments/:paymentId/status', authenticateToken, requireAdmin, async (req, res) => {
  const paymentId = Number(req.params.paymentId); const { status } = req.body || {};
  if (!Number.isInteger(paymentId) || !['paid', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'สถานะที่ส่งมาไม่ถูกต้อง' });
  try {
    const [[payment]] = await db.query('SELECT tenant_id FROM payments WHERE id = ?', [paymentId]);
    const [result] = await db.query(`UPDATE payments SET status = ?, paid_date = CASE WHEN ? = 'paid' THEN CURDATE() ELSE NULL END WHERE id = ? AND status = 'reviewing'`, [status, status, paymentId]);
    if (!result.affectedRows) return res.status(409).json({ success: false, message: 'รายการนี้ไม่ได้อยู่ระหว่างรอตรวจสอบ' });
    await createNotification(payment?.tenant_id, 'payment', status === 'paid' ? 'อนุมัติการชำระเงินแล้ว' : 'ปฏิเสธหลักฐานการชำระเงิน', status === 'paid' ? 'ใบแจ้งหนี้ของคุณชำระเรียบร้อยแล้ว' : 'กรุณาตรวจสอบและส่งหลักฐานการชำระเงินใหม่', paymentId, '/user/payment', `payment-${status}:${paymentId}`);
    res.json({ success: true, data: { paymentId, status }, message: status === 'paid' ? 'อนุมัติการชำระเงินแล้ว' : 'ปฏิเสธหลักฐานแล้ว' });
  } catch (error) { console.error('Admin payment status update error:', error); res.status(500).json({ success: false, message: 'ไม่สามารถปรับสถานะการชำระเงินได้' }); }
});

// =================================
// Start Server
// =================================

const PORT = 4000;

// Keep API failures JSON-only.  In particular, Express's JSON parser otherwise
// returns an HTML error document for malformed request bodies.
app.use((error, req, res, next) => {
  if (error?.code === 'INVALID_REPAIR_IMAGE') {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (error instanceof multer.MulterError) {
    const repairUpload = req.path.includes('/repairs');
    return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? `ไฟล์${repairUpload ? 'รูปภาพ' : 'สลิป'}ต้องมีขนาดไม่เกิน 5 MB` : repairUpload ? 'อัปโหลดรูปภาพได้สูงสุด 5 รูป' : 'ไม่สามารถอัปโหลดไฟล์สลิปได้' });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ success: false, message: 'รูปแบบ JSON ของคำขอไม่ถูกต้อง' });
  }
  console.error('Unhandled API error:', error);
  return res.status(error.status || 500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ' });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `ขณะนี้เซิฟเวอร์กำลังรันอยู่บนพอร์ต http://localhost:${PORT} งับ`
  );
});
