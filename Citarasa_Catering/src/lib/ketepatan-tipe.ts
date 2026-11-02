/**
 * Metrik "ketepatan waktu" — janji merek "tepat" yang diukur, bukan diklaim.
 * Fungsi murni (tanpa database) supaya bisa diuji; kuerinya di ketepatan.ts.
 */

export type DataKetepatan = {
  /** Pesanan (tidak batal) yang ditandai SIAP dalam rentang waktu. */
  total: number;
  /** ...yang ditandai siap pada/sebelum jam acara. */
  tepat: number;
  /** Median selisih (menit) jam siap dicatat terhadap jam acara; positif = lebih awal. */
  medianMenitLebihAwal: number | null;
};

/** Di bawah ini persentasenya terlalu goyang untuk dipajang. */
export const MINIMAL_SAMPEL_KETEPATAN = 5;

export type RingkasanKetepatan =
  | { cukup: false; total: number; butuh: number }
  | { cukup: true; total: number; tepat: number; persen: number; nada: "baik" | "waspada" | "buruk"; keteranganMedian: string | null };

export function ringkasKetepatan(d: DataKetepatan): RingkasanKetepatan {
  if (d.total < MINIMAL_SAMPEL_KETEPATAN) {
    return { cukup: false, total: d.total, butuh: MINIMAL_SAMPEL_KETEPATAN - d.total };
  }
  // Dibulatkan ke bawah: 99,6% tidak boleh tampil "100%" kalau ada yang telat.
  const persen = Math.floor((d.tepat / d.total) * 100);
  const nada = persen >= 95 ? "baik" : persen >= 85 ? "waspada" : "buruk";
  let keteranganMedian: string | null = null;
  if (d.medianMenitLebihAwal !== null) {
    const m = Math.round(d.medianMenitLebihAwal);
    keteranganMedian =
      m > 0 ? `biasanya siap ${m} menit sebelum jam acara` : m < 0 ? `biasanya terlambat ${-m} menit` : "biasanya siap tepat di jam acara";
  }
  return { cukup: true, total: d.total, tepat: d.tepat, persen, nada, keteranganMedian };
}
