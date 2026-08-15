import express from "express";
import cors from "cors";
import db from "./db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const app = express();

app.use(cors());
app.use(express.json());

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
      tenantName,
      description,
    } = req.body;

    await db.query(
      `UPDATE rooms
       SET
         room_number = ?,
         floor = ?,
         type = ?,
         size_sqm = ?,
         monthly_rent = ?,
         status = ?,
         tenant_name = ?,
         description = ?
       WHERE id = ?`,
      [
        roomNumber,
        floor,
        type,
        size,
        monthlyRent,
        roomStatus,
        tenantName || null,
        description || null,
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
      message: "ไม่สามารถแก้ไขข้อมูลห้องได้",
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
          cp.status,
          cp.image_url,
          cp.created_at,
          cp.updated_at,

          r.room_number

        FROM complaints cp

        INNER JOIN rooms r
          ON r.id = cp.room_id

        WHERE cp.tenant_id = ?

        ORDER BY cp.created_at DESC
        `,
        [userId]
      );

      res.json({
        success: true,
        data: complaints,
      });

    } catch (error) {
      console.error("Tenant Complaints Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถดึงข้อมูลการแจ้งซ่อมได้",
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
      } = req.body;

      if (!type || !title || !description) {
        return res.status(400).json({
          success: false,
          message: "กรุณากรอกข้อมูลให้ครบ",
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

      // -----------------------------
      // เพิ่มรายการแจ้งซ่อม
      // -----------------------------

      const [result] = await db.query(
        `
        INSERT INTO complaints
        (
          room_id,
          tenant_id,
          type,
          title,
          description,
          status
        )
        VALUES (?, ?, ?, ?, ?, 'open')
        `,
        [
          roomId,
          userId,
          type,
          title,
          description,
        ]
      );

      res.status(201).json({
        success: true,
        message: "แจ้งซ่อมเรียบร้อย",
        complaintId: result.insertId,
      });

    } catch (error) {
      console.error("Create Complaint Error:", error);

      res.status(500).json({
        success: false,
        message: "ไม่สามารถแจ้งซ่อมได้",
        error: error.message,
      });
    }
  }
);

// =================================
// Start Server
// =================================

const PORT = 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `ขณะนี้เซิฟเวอร์กำลังรันอยู่บนพอร์ต http://localhost:${PORT} งับ`
  );
});