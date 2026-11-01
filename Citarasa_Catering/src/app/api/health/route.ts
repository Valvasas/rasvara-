import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { periksaPenyimpanan } from "@/lib/unggah";
import { jenisKoneksiDatabase } from "@/lib/url-database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEADER_TANPA_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
};

/**
 * Pemeriksaan kesehatan publik untuk monitor uptime & verifikasi setelah deploy.
 *
 * Selain database, konfigurasi yang kalau salah baru ketahuan di tangan pembeli
 * ikut diperiksa (rahasia sesi, penyimpanan foto). Yang dikembalikan hanya
 * label status — tidak pernah nilai, nama host, atau pesan galat mentah,
 * karena endpoint ini bisa dibuka siapa saja.
 */
export async function GET() {
  const mulai = Date.now();

  let database: { status: "terhubung"; latensiMs: number } | { status: "terputus" };
  try {
    await db.pengaturan.count();
    database = { status: "terhubung", latensiMs: Date.now() - mulai };
  } catch (error) {
    // Pesan galat mentah hanya di log server: isinya bisa memuat nama host,
    // pengguna, atau struktur database.
    console.error(
      "[HealthCheck] Database tidak merespons:",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui"
    );
    database = { status: "terputus" };
  }

  // Membantu pemilik memeriksa sendiri isian DATABASE_URL di dashboard hosting
  // (kutip terbawa, koneksi langsung IPv6, pooler sesi) tanpa membuka nilainya.
  const koneksiDatabase = jenisKoneksiDatabase(process.env.DATABASE_URL);
  const rahasiaSesi = (process.env.SESSION_SECRET?.length ?? 0) >= 32 ? "ok" : "kurang";
  const penyimpanan = await periksaPenyimpanan();
  const penyimpananSehat = penyimpanan === "supabase" || penyimpanan === "lokal";

  const sehat = database.status === "terhubung" && rahasiaSesi === "ok" && penyimpananSehat;

  return NextResponse.json(
    {
      status: sehat ? "ok" : "error",
      pesan: sehat
        ? "Citarasa Catering berjalan normal"
        : "Ada bagian layanan yang belum siap — lihat rincian di bawah",
      lingkungan: process.env.NODE_ENV ?? "unknown",
      uptimeDetik: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
      konfigurasi: { koneksiDatabase, rahasiaSesi, penyimpanan },
    },
    { status: sehat ? 200 : 503, headers: HEADER_TANPA_CACHE }
  );
}
