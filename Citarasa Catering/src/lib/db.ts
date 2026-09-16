import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { Pool } from "pg";

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
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi database."
    );
  }

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

function ambilKlien(): ReturnType<typeof buatClient> {
  if (!globalForPrisma.prisma) {
    const klien = buatClient();
    // Di produksi klien disimpan di variabel modul saja; cache global hanya
    // diperlukan untuk bertahan dari hot-reload saat pengembangan.
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = klien;
      return klien;
    }
    globalForPrisma.prisma = klien;
  }
  return globalForPrisma.prisma;
}

/**
 * Klien dibuat saat pertama kali dipakai, bukan saat modul diimpor.
 *
 * Membuat pool koneksi di badan modul berarti setiap berkas yang mengimpor
 * `auth.ts` — termasuk unit test yang hanya menguji hashing sandi — ikut
 * menuntut `DATABASE_URL` dan gagal sebelum satu pun pengujian berjalan.
 * Pesan galat yang ramah tetap dipertahankan, hanya waktunya digeser ke
 * pemakaian pertama yang benar-benar menyentuh database.
 */
export const db = new Proxy({} as ReturnType<typeof buatClient>, {
  get(_sasaran, properti, penerima) {
    const klien = ambilKlien();
    const nilai = Reflect.get(klien, properti, penerima);
    return typeof nilai === "function" ? nilai.bind(klien) : nilai;
  },
});
