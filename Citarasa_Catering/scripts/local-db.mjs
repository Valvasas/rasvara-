import { PGlite } from "@electric-sql/pglite";
import { createServer } from "pglite-server";

const db = new PGlite();
const server = createServer(db);

const PORT = process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432;

server.listen(PORT, () => {
  console.log(`[local-db] PostgreSQL wire server aktif di localhost:${PORT}`);
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
