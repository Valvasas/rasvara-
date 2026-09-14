import { PGlite } from "@electric-sql/pglite";
import { createServer } from "pglite-server";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.resolve(process.cwd(), ".pgdata");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new PGlite(dataDir);
const server = createServer(db);

const PORT = process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432;

server.listen(PORT, () => {
  console.log(`[local-db] PostgreSQL wire server aktif di localhost:${PORT}`);
  console.log(`[local-db] Data tersimpan di: ${dataDir}`);
});

server.on("error", (err) => {
  console.error("[local-db] Server error:", err);
});

process.on("SIGINT", () => {
  console.log("\n[local-db] Menghentikan server database...");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

