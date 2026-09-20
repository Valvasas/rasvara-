import { db } from "@/lib/db";
import { hariIniWib } from "@/lib/format";

/**
 * Batas hari menurut WIB, bukan menurut jam server. Satu hari kerja usaha ini
 * dimulai pukul 00.00 WIB, yang sama dengan pukul 17.00 UTC hari sebelumnya.
 */
export function rentangHari(kunci: string): { gte: Date; lt: Date } {
  const [tahun, bulan, hari] = kunci.split("-").map(Number);
  const gte = new Date(Date.UTC(tahun, bulan - 1, hari, -7, 0, 0));
  const lt = new Date(gte.getTime() + 86_400_000);
  return { gte, lt };
}

/** Rentang beberapa hari ke belakang, termasuk hari ini. */
export function rentangMundur(jumlahHari: number): { gte: Date; lt: Date } {
  const akhir = rentangHari(hariIniWib());
  return {
    gte: new Date(akhir.lt.getTime() - jumlahHari * 86_400_000),
    lt: akhir.lt,
  };
}

/** Rentang satu bulan penuh menurut WIB, dari "2026-09". */
export function rentangBulan(kunciBulan: string): { gte: Date; lt: Date } {
  const [tahun, bulan] = kunciBulan.split("-").map(Number);
  const gte = new Date(Date.UTC(tahun, bulan - 1, 1, -7, 0, 0));
  const lt = new Date(Date.UTC(tahun, bulan, 1, -7, 0, 0));
  return { gte, lt };
}

export type RingkasanKas = {
  masuk: number;
  keluar: number;
  selisih: number;
};

export async function ringkasanKas(
  rentang: { gte: Date; lt: Date }
): Promise<RingkasanKas> {
  const baris = await db.catatanKas.groupBy({
    by: ["jenis"],
    where: { tanggal: rentang },
    _sum: { jumlah: true },
  });

  const masuk = baris.find((b) => b.jenis === "MASUK")?._sum.jumlah ?? 0;
  const keluar = baris.find((b) => b.jenis === "KELUAR")?._sum.jumlah ?? 0;

  return { masuk, keluar, selisih: masuk - keluar };
}
