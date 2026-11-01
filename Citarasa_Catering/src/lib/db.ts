import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { Pool } from "pg";
import { bersihkanUrlDatabase, urlDatabaseSah } from "@/lib/url-database";

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

/**
 * Pengaturan SSL untuk database terkelola (Supabase).
 *
 * `pg` versi baru memperlakukan `sslmode=require` di connection string sebagai
 * verifikasi sertifikat penuh, sedangkan sertifikat pooler Supabase ditandatangani
 * CA milik Supabase yang tidak ada di daftar CA bawaan Node — hasilnya galat
 * "self-signed certificate in certificate chain" dan seluruh situs mati.
 * Nilai `sslmode` di URL juga MENIMPA opsi `ssl` yang diberikan ke Pool,
 * jadi parameter itu dilepas dari URL dan SSL diatur di sini:
 *
 * - `DB_SSL_CA` diisi (isi sertifikat CA Supabase, format PEM): koneksi
 *   terenkripsi DAN sertifikat diverifikasi penuh. Paling aman.
 * - host Supabase tanpa `DB_SSL_CA`: tetap terenkripsi, tanpa verifikasi CA.
 * - host lain (localhost, VPS): mengikuti connection string apa adanya.
 */
export function konfigurasiKoneksi(mentah: string): { connectionString: string; ssl?: { ca?: string; rejectUnauthorized: boolean } } {
  // Kutip/spasi hasil salin-tempel dibuang; URL yang tetap rusak dihentikan di
  // sini dengan pesan yang menunjuk penyebabnya (lihat lib/url-database.ts).
  const url = urlDatabaseSah(mentah);
  const bersih = bersihkanUrlDatabase(mentah);
  const ca = process.env.DB_SSL_CA?.trim().replace(/\\n/g, "\n");
  const terkelola = /\.supabase\.(com|co)$/.test(url.hostname);
  if (!ca && !terkelola) return { connectionString: bersih };

  url.searchParams.delete("sslmode");
  url.searchParams.delete("sslrootcert");
  // Parameter khusus Prisma lama; tidak dipakai driver `pg`.
  url.searchParams.delete("pgbouncer");
  return {
    connectionString: url.toString(),
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  };
}

function buatClient() {
  const mentah = process.env.DATABASE_URL;
  if (!mentah) {
    throw new Error(
      "DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi database."
    );
  }

  // Serverless (Vercel): banyak instans kecil yang hidup-mati, masing-masing
  // memegang pool sendiri. Pool kecil + koneksi menganggur cepat ditutup
  // supaya jatah klien pooler Supabase tidak habis saat pengunjung ramai.
  const serverless = Boolean(process.env.VERCEL);
  const pool = new Pool({
    ...konfigurasiKoneksi(mentah),
    max: angkaEnv("DB_POOL_MAX", serverless ? 5 : 20),
    connectionTimeoutMillis: angkaEnv("DB_CONNECT_TIMEOUT_MS", serverless ? 10_000 : 5000),
    idleTimeoutMillis: serverless ? 10_000 : 30_000,
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
