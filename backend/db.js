import mysql from "mysql2/promise";
import "dotenv/config";

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3310),
  user: process.env.DB_USER || "react_user",
  password: process.env.DB_PASSWORD || "react123",
  database: process.env.DB_NAME || "react_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;
