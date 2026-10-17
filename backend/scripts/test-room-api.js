import db from "../db.js";

const apiUrl = process.env.API_URL || "http://localhost:4000/api";
const roomNumber = `T${Date.now().toString().slice(-8)}`;
let roomId;

const request = async (path, options) => {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json();

  if (!response.ok || !body.success) {
    throw new Error(
      `${options?.method || "GET"} ${path}: ${body.message}${
        body.error ? ` (${body.error})` : ""
      }`
    );
  }

  return body;
};

try {
  const created = await request("/rooms", {
    method: "POST",
    body: JSON.stringify({
      roomNumber,
      floor: "1",
      type: "1-bedroom",
      size: "45",
      monthlyRent: "7000",
    }),
  });
  roomId = created.id;

  const afterCreate = await request("/rooms");
  const createdRoom = afterCreate.data.find((room) => room.id === roomId);
  if (createdRoom?.type !== "1-bedroom") {
    throw new Error("Created room did not retain type 1-bedroom");
  }

  await request(`/rooms/${roomId}`, {
    method: "PUT",
    body: JSON.stringify({
      roomNumber,
      floor: "1",
      type: "1-bedroom",
      size: "46",
      monthlyRent: "7100",
      roomStatus: "available",
      tenantName: null,
      description: "API room-type verification",
    }),
  });

  const afterUpdate = await request("/rooms");
  const updatedRoom = afterUpdate.data.find((room) => room.id === roomId);
  if (
    updatedRoom?.type !== "1-bedroom" ||
    Number(updatedRoom?.size) !== 46 ||
    Number(updatedRoom?.rent) !== 7100
  ) {
    throw new Error("Updated room did not retain its expected values");
  }

  const invalidResponse = await fetch(`${apiUrl}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomNumber: `${roomNumber}-invalid`,
      floor: "1",
      type: "unsupported-type",
      monthlyRent: "7000",
    }),
  });
  const invalidBody = await invalidResponse.json();
  if (invalidResponse.status !== 400 || invalidBody.success !== false) {
    throw new Error("Unsupported room type was not rejected with HTTP 400");
  }

  console.log("Create, read, update, and room-type validation checks passed.");
} finally {
  if (roomId) {
    await db.query("DELETE FROM rooms WHERE id = ?", [roomId]);
  }
  await db.end();
}
