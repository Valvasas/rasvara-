/**
 * Merapikan & memeriksa connection string database dari environment.
 *
 * Dipisah sebagai modul murni (tanpa Prisma/pg) supaya dipakai bersama oleh
 * aplikasi (`lib/db.ts`), seed, dan `prisma.config.ts` (migrasi).
 *
 * Kesalahan tempel yang paling lazim di dashboard hosting: nilai disalin dari
 * berkas `.env` lengkap dengan tanda kutipnya (`"postgresql://…"`), atau
 * terbawa spasi/baris baru. Parser `.env` membuang kutip itu, tetapi dashboard
 * Vercel menyimpannya apa adanya — dan driver `pg` lalu menganggap string itu
 * relatif terhadap `postgres://base`, sehingga galatnya berbunyi
 * "Can't reach database server at base" yang sama sekali tidak menunjuk ke
 * penyebabnya.
 */
export function bersihkanUrlDatabase(mentah: string): string {
  let nilai = mentah.trim();
  const kutip = nilai[0];
  if (nilai.length >= 2 && (kutip === '"' || kutip === "'") && nilai.at(-1) === kutip) {
    nilai = nilai.slice(1, -1).trim();
  }
  return nilai;
}

/**
 * Pesan galat sengaja TIDAK memuat nilai URL: isinya memuat sandi database,
 * dan pesan ini bisa berakhir di log hosting.
 */
export const PESAN_URL_DATABASE_RUSAK =
  "DATABASE_URL tidak berbentuk postgresql://pengguna:sandi@host:port/nama_db. " +
  "Periksa: tanpa tanda kutip di awal/akhir, tanpa spasi, dan karakter khusus di sandi " +
  "(# ? / @ : % spasi) ditulis dalam bentuk URL-encoded (mis. # menjadi %23).";

export type JenisKoneksiDatabase =
  | "kosong"
  | "rusak"
  | "supabase-pooler-transaksi"
  | "supabase-pooler-sesi"
  | "supabase-langsung"
  | "lain";

/**
 * Label jenis koneksi untuk /api/health — tanpa host, pengguna, atau sandi.
 *
 * Di Vercel hanya `supabase-pooler-transaksi` (port 6543) yang benar:
 * koneksi langsung `db.<ref>.supabase.co` hanya IPv6 (tak terjangkau dari
 * Vercel), dan pooler sesi menahan satu koneksi per klien sehingga cepat habis
 * dibagi banyak instans serverless.
 */
export function jenisKoneksiDatabase(mentah: string | undefined): JenisKoneksiDatabase {
  if (!mentah?.trim()) return "kosong";
  let url: URL;
  try {
    url = urlDatabaseSah(mentah);
  } catch {
    return "rusak";
  }
  if (url.hostname.endsWith(".pooler.supabase.com")) {
    return url.port === "6543" ? "supabase-pooler-transaksi" : "supabase-pooler-sesi";
  }
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(url.hostname)) return "supabase-langsung";
  return "lain";
}

/** Mengembalikan URL yang sudah dirapikan, atau melempar galat yang jelas. */
export function urlDatabaseSah(mentah: string): URL {
  let url: URL;
  try {
    url = new URL(bersihkanUrlDatabase(mentah));
  } catch {
    throw new Error(PESAN_URL_DATABASE_RUSAK);
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(PESAN_URL_DATABASE_RUSAK);
  }
  return url;
}
