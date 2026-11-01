import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { bersihkanUrlDatabase } from "./src/lib/url-database";

/**
 * Migrasi memakai DIRECT_URL bila ada. Di Supabase, DATABASE_URL aplikasi
 * menunjuk ke pooler mode transaksi (port 6543) yang cocok untuk serverless
 * tetapi tidak untuk migrasi (butuh satu sesi utuh); migrasi dijalankan lewat
 * pooler mode sesi (port 5432) atau koneksi langsung yang diisikan ke
 * DIRECT_URL. Di komputer pengembang cukup DATABASE_URL saja.
 *
 * Tidak memakai `env()` dari prisma/config karena ia melempar galat bila
 * variabelnya kosong — padahal `prisma generate` saat build tidak butuh
 * koneksi database sama sekali.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Kutip/spasi hasil salin-tempel dari .env ikut dibuang di sini.
    url: bersihkanUrlDatabase(process.env.DIRECT_URL || process.env.DATABASE_URL || ""),
  },
});
