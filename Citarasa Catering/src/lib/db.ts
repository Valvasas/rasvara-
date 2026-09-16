import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi database."
  );
}

/**
 * Bawaan `pg` hanya 10 koneksi. Begitu pengunjung serentak melewati angka itu,
 * permintaan berikutnya mengantre sampai ada koneksi yang bebas, dan kalau
 * antreannya lebih lama dari `connectionTimeoutMillis` halamannya gagal dimuat.
 * Angkanya bisa disetel per server, karena batas sesungguhnya ada di
 * `max_connections` milik PostgreSQL.
 */
function angkaEnv(nama: string, bawaan: number): number {
  const nilai = Number(process.env[nama]);
  return Number.isFinite(nilai) && nilai > 0 ? nilai : bawaan;
}

function buatClient() {
  const pool = new Pool({
    connectionString,
    max: angkaEnv("DB_POOL_MAX", 20),
    connectionTimeoutMillis: angkaEnv("DB_CONNECT_TIMEOUT_MS", 5000),
    idleTimeoutMillis: 30_000,
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
