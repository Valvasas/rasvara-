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

let klien: ReturnType<typeof buatClient> | undefined;

function ambilKlien(): ReturnType<typeof buatClient> {
  if (klien) return klien;

  klien = globalForPrisma.prisma ?? buatClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = klien;
  }
  return klien;
}

/**
 * Koneksi baru dibuka saat kueri pertama, bukan saat modul diimpor.
 *
 * Bedanya terasa di luar server: berkas seperti `lib/auth.ts` mengimpor `db`
 * hanya untuk satu kueri peran, jadi kalau klien dibuat saat impor, setiap unit
 * test yang menyentuh berkas itu ikut menuntut `DATABASE_URL` walau tidak
 * pernah menyentuh database sama sekali. Pesan galat yang sama tetap muncul
 * pada pemakaian pertama, jadi salah konfigurasi di server tetap kelihatan.
 */
export const db: ReturnType<typeof buatClient> = new Proxy(
  {} as ReturnType<typeof buatClient>,
  {
    get(_sasaran, nama) {
      const nyata = ambilKlien();
      const nilai = Reflect.get(nyata, nama, nyata);
      // `this` harus tetap menunjuk klien asli, bukan proxy kosong ini.
      return typeof nilai === "function" ? nilai.bind(nyata) : nilai;
    },
  }
);
