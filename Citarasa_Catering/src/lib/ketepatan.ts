import { db } from "@/lib/db";
import type { DataKetepatan } from "@/lib/ketepatan-tipe";

/**
 * Ketepatan waktu dapur dalam N hari terakhir: untuk setiap pesanan yang
 * tidak batal, jam PERTAMA ia ditandai SIAP (RiwayatStatus) dibandingkan
 * dengan jadwalnya (tanggal acara WIB + jamAcara).
 *
 * Semua dihitung di database dalam satu kueri. `tanggalAcara` disimpan
 * sebagai pukul 12.00 WIB (lihat dariInputTanggal), jadi tanggal WIB-nya
 * aman diambil dengan konversi zona waktu. Baris dengan jamAcara yang tidak
 * berformat HH:MM (data impor lama) dilewati, bukan menggagalkan dashboard.
 */
export async function ambilKetepatanWaktu(hari = 30): Promise<DataKetepatan> {
  const sejak = new Date(Date.now() - hari * 86_400_000);
  const [baris] = await db.$queryRaw<{ total: number; tepat: number; median: number | null }[]>`
    WITH siap AS (
      SELECT DISTINCT ON (p.id)
        ((r."dibuatPada" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta') AS dicatat,
        (((p."tanggalAcara" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date + p."jamAcara"::time) AS jadwal
      FROM "RiwayatStatus" r
      JOIN "Pesanan" p ON p.id = r."pesananId"
      WHERE r.ke = 'SIAP'
        AND r."dibuatPada" >= ${sejak}
        AND p.status <> 'DIBATALKAN'
        AND p."jamAcara" ~ '^[0-2][0-9]:[0-5][0-9]$'
      ORDER BY p.id, r."dibuatPada" ASC
    )
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE dicatat <= jadwal)::int AS tepat,
           (percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (jadwal - dicatat)) / 60))::float AS median
    FROM siap`;
  return {
    total: baris?.total ?? 0,
    tepat: baris?.tepat ?? 0,
    medianMenitLebihAwal: baris?.median ?? null,
  };
}
