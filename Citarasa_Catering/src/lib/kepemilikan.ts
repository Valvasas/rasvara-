/**
 * Aturan "pesanan ini milik siapa" dan "boleh diarahkan ke mana" — ditulis
 * sebagai fungsi murni supaya bisa diuji tanpa database maupun cookie.
 */

type SesiRingkas = { id: string; peran: string } | null | undefined;

/**
 * Pelanggan yang login hanya memiliki pesanan yang memang tersambung ke
 * akunnya (`penggunaId`).
 *
 * Dulu pencocokannya memakai nomor HP: siapa pun yang login dengan nomor yang
 * sama dengan pemesan bisa melihat pesanan itu. Masalahnya, nomor HP saat
 * mendaftar tidak pernah diverifikasi (belum ada OTP). Orang lain cukup
 * mendaftar memakai nomor korban — yang lazim tertulis di grup WhatsApp,
 * kartu nama, atau undangan acara — lalu membuka seluruh riwayat pesanannya:
 * nama, alamat rumah, titik peta, sampai foto bukti transfer. Kepemilikan
 * kini hanya diberikan lewat jalur yang membuktikan sesuatu: memesan saat
 * login, atau mengklaim pesanan tamu dari perangkat yang memegang cookie
 * bertanda tangan (lihat `klaimPesananTamu`).
 */
export function pesananMilikAkun(
  sesi: SesiRingkas,
  pesanan: { penggunaId: string | null }
): boolean {
  return Boolean(sesi && pesanan.penggunaId && pesanan.penggunaId === sesi.id);
}

/** Pemilik dan staf dapur boleh membuka pesanan siapa pun. */
export function sesiDapur(sesi: SesiRingkas): boolean {
  return Boolean(sesi && (sesi.peran === "PEMILIK" || sesi.peran === "STAF_DAPUR"));
}

/**
 * Tujuan setelah login (`?ke=/pesan`) hanya boleh path internal.
 *
 * Tanpa penyaringan ini, tautan `…/masuk?ke=https://situs-tiruan.com` bisa
 * dikirim ke pembeli: ia login di situs asli, lalu dilempar ke halaman tiruan
 * yang meminta sandinya "sekali lagi". `//evil.com` dan `/\evil.com` juga
 * ditolak karena peramban membacanya sebagai alamat domain lain.
 */
export function tujuanAman(mentah: unknown, cadangan: string): string {
  if (typeof mentah !== "string") return cadangan;
  const nilai = mentah.trim();
  if (nilai.length === 0 || nilai.length > 200) return cadangan;
  if (!nilai.startsWith("/")) return cadangan;
  if (nilai.startsWith("//") || nilai.startsWith("/\\")) return cadangan;
  // Karakter kendali (termasuk tab & baris baru) bisa dipakai menyelundupkan
  // skema lain lewat normalisasi URL di peramban.
  // Diperiksa per kode karakter (bukan regex) supaya aturan lint
  // no-control-regex tidak perlu dimatikan.
  for (let i = 0; i < nilai.length; i++) {
    const kode = nilai.charCodeAt(i);
    if (kode < 0x20 || kode === 0x7f || nilai[i] === "\\") return cadangan;
  }
  // Halaman masuk/daftar sebagai tujuan hanya membuat putaran tanpa akhir.
  if (/^\/(masuk|daftar)(\/|\?|$)/.test(nilai)) return cadangan;
  return nilai;
}
