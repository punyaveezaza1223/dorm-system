import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import db from "../db.js";

const migrationsDirectory = dirname(fileURLToPath(import.meta.url));
try {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const sql = await readFile(join(migrationsDirectory, migrationFile), "utf8");
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      const [result] = await db.query(statement);
      if (Array.isArray(result) && result[0]?.migration_result) {
        console.log(`${migrationFile}: ${result[0].migration_result}`);
      }
    }
  }

  console.log("Migrations completed.");
} finally {
  await db.end();
}
