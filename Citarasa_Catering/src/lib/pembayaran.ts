import type { JenisPembayaran, StatusBayar } from "@/generated/prisma/client";

/**
 * Aturan pembayaran (DP, pelunasan, refund) sebagai fungsi murni supaya sama
 * persis di server, di layar pembeli, dan di dashboard — serta bisa diuji.
 */

/** Sisa yang masih harus dibayar; tidak pernah negatif. */
export function sisaTagihan(total: number, dibayar: number): number {
  return Math.max(0, total - dibayar);
}

/**
 * DP minimal dibulatkan ke atas ke Rp1.000 (angka transfer yang wajar), dan
 * tidak pernah melebihi total. Persen 0 = tanpa DP.
 */
export function hitungMinimalDp(total: number, persen: number): number {
  if (persen <= 0 || total <= 0) return 0;
  const p = Math.min(100, persen);
  return Math.min(total, Math.ceil((total * p) / 100 / 1000) * 1000);
}

/**
 * Status bayar diturunkan dari angka, bukan disimpan terpisah lalu dirawat
 * manual — dua sumber kebenaran untuk uang selalu berakhir tidak sinkron.
 */
export function statusBayarDari(o: { total: number; dibayar: number; menungguVerifikasi: boolean }): StatusBayar {
  if (o.dibayar >= o.total) return "LUNAS";
  if (o.menungguVerifikasi) return "MENUNGGU_VERIFIKASI";
  if (o.dibayar > 0) return "SEBAGIAN";
  return "BELUM_BAYAR";
}

/** Jumlah yang disarankan saat mencatat pembayaran: kekurangan DP dulu, lalu sisa. */
export function saranJumlahBayar(o: { total: number; dibayar: number; minimalDp: number }): number {
  const sisa = sisaTagihan(o.total, o.dibayar);
  if (o.dibayar < o.minimalDp) return Math.min(sisa, o.minimalDp - o.dibayar);
  return sisa;
}

/** Pembayaran yang menutup seluruh sisa disebut pelunasan, selain itu DP/cicilan. */
export function jenisPembayaranUntuk(jumlah: number, total: number, dibayar: number): JenisPembayaran {
  return jumlah >= sisaTagihan(total, dibayar) ? "PELUNASAN" : "DP";
}

export const LABEL_JENIS_BAYAR: Record<JenisPembayaran, string> = {
  DP: "DP / cicilan",
  PELUNASAN: "Pelunasan",
  REFUND: "Pengembalian dana",
};
