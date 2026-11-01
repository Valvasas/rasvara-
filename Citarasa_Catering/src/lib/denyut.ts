import { db } from "@/lib/db";

export type DenyutDapur = {
  /** Pesanan BARU yang belum ditanggapi. */
  baru: number;
  /** Pembayaran menunggu dicek (hanya dihitung untuk pemilik). */
  cekBayar: number;
  /** Pesanan siap diserahkan. */
  siap: number;
  /** Penanda pesanan terbaru — berubah tepat saat ada pesanan masuk. */
  terbaru: { kode: string; nama: string; pada: string } | null;
};

/**
 * "Denyut" dapur: angka-angka kecil yang dipantau dashboard setiap 30 detik.
 * Empat kueri ringan yang semuanya tertopang indeks (status, statusBayar,
 * dibuatPada) — aman dipanggil dari banyak tab dapur sekaligus.
 */
export async function ambilDenyut(untukPemilik: boolean): Promise<DenyutDapur> {
  const [baru, cekBayar, siap, terbaru] = await Promise.all([
    db.pesanan.count({ where: { status: "BARU" } }),
    untukPemilik
      ? db.pesanan.count({ where: { statusBayar: "MENUNGGU_VERIFIKASI", status: { not: "DIBATALKAN" } } })
      : Promise.resolve(0),
    db.pesanan.count({ where: { status: "SIAP" } }),
    db.pesanan.findFirst({
      orderBy: { dibuatPada: "desc" },
      select: { kode: true, namaPemesan: true, dibuatPada: true },
    }),
  ]);
  return {
    baru,
    cekBayar,
    siap,
    terbaru: terbaru ? { kode: terbaru.kode, nama: terbaru.namaPemesan, pada: terbaru.dibuatPada.toISOString() } : null,
  };
}
