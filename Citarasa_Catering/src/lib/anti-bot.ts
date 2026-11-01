import { bukaTandatangan, tandatangani } from "@/lib/cookie-tertanda";

/**
 * Perlindungan ringan formulir pesanan dari bot — tanpa CAPTCHA.
 *
 * CAPTCHA (memilih gambar lampu lalu lintas) adalah penghalang nyata bagi
 * pembeli lanjut usia, padahal mereka pasar utama katering. Dua lapis yang
 * tidak terlihat manusia ini menghentikan bot penyebar pesanan palsu yang
 * lazim (pengisi formulir otomatis):
 *
 * 1. Honeypot: kolom tersembunyi yang tidak pernah dilihat manusia, tapi
 *    diisi bot yang mengisi semua kolom.
 * 2. Token waktu bertanda tangan: halaman checkout menyisipkan waktu muat
 *    yang ditandatangani server. Kiriman yang datang < 2 detik setelah halaman
 *    dibuka (manusia butuh jauh lebih lama untuk mengisi jadwal & data), tanpa
 *    token, atau dengan token karangan, ditolak.
 *
 * Pembatas laju per-IP tetap berjalan di atas keduanya.
 */

export { NAMA_HONEYPOT, NAMA_TOKEN } from "@/lib/anti-bot-nama";

const MIN_DETIK = 2;
/** Tab checkout yang dibiarkan terbuka lama tetap bisa dipakai. */
const MAKS_UMUR_MS = 48 * 60 * 60 * 1000;

export function buatTokenFormulir(sekarangMs: number, rahasia: string): string {
  return tandatangani(`pesan:${sekarangMs}`, rahasia);
}

export type HasilToken = "ok" | "terlalu-cepat" | "kedaluwarsa" | "tidak-sah";

export function periksaTokenFormulir(token: unknown, sekarangMs: number, rahasia: string): HasilToken {
  if (typeof token !== "string" || token.length > 200) return "tidak-sah";
  const muatan = bukaTandatangan(token, rahasia);
  if (!muatan?.startsWith("pesan:")) return "tidak-sah";
  const dimuat = Number(muatan.slice(6));
  if (!Number.isFinite(dimuat)) return "tidak-sah";
  const umur = sekarangMs - dimuat;
  if (umur < MIN_DETIK * 1000) return "terlalu-cepat";
  if (umur > MAKS_UMUR_MS) return "kedaluwarsa";
  return "ok";
}

/** Honeypot terisi = hampir pasti bot. */
export function honeypotTerisi(nilai: unknown): boolean {
  return typeof nilai === "string" && nilai.trim().length > 0;
}
