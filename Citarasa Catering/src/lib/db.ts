import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi database."
  );
}

function buatClient() {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 1000,
  });
  return new PrismaClient({
    adapter: new PrismaPg(pool),
  });
}

// Next.js hot-reload membuat modul dievaluasi ulang; tanpa cache global,
// tiap reload membuka pool koneksi baru sampai database menolak koneksi.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof buatClient>;
};

export const db = globalForPrisma.prisma ?? buatClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
