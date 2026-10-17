import db from "../db.js";

try {
  const [columns] = await db.query(
    "SHOW COLUMNS FROM rooms WHERE Field = ?",
    ["type"]
  );
  const [rooms] = await db.query(
    "SELECT id, room_number, type FROM rooms ORDER BY id"
  );

  console.log(JSON.stringify({ typeColumn: columns[0] ?? null, rooms }, null, 2));
} finally {
  await db.end();
}
