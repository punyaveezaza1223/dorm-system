import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  port: 3310,
  user: "react_user",
  password: "react123",
  database: "react_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default db;