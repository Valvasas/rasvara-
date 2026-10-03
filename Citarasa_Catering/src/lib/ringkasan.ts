import { db } from "@/lib/db";
import { rentangHari } from "@/lib/laporan";
import { dariInputTanggal, hariIniWib, kunciHari } from "@/lib/format";
import { KOLOM_PAPAN } from "@/lib/pesanan";

export type RingkasanHariIni = {
  hariIni: { jumlah: number; jamPertama: string | null };
  besok: { jumlah: number; tanggal: string };
  perluCek: number;
  piutangLewat: { jumlah: number; nilai: number };
};

/** Kunci tanggal WIB untuk besok, mis. "2026-10-04". */
export function kunciBesok(): string {
  return kunciHari(new Date(dariInputTanggal(hariIniWib()).getTime() + 86_400_000));
}

/**
 * Angka untuk kartu ringkas di atas papan dapur. Semua dihitung di database
 * (count/aggregate), jadi biayanya tetap kecil walau pesanannya ribuan.
 */
export async function ambilRingkasanHariIni(denganUang: boolean): Promise<RingkasanHariIni> {
  const hari = hariIniWib();
  const besok = kunciBesok();
  const rHari = rentangHari(hari);
  const rBesok = rentangHari(besok);

  const [jmlHari, pertama, jmlBesok, perluCek, piutang] = await Promise.all([
    db.pesanan.count({ where: { tanggalAcara: rHari, status: { not: "DIBATALKAN" } } }),
    db.pesanan.findFirst({
      where: { tanggalAcara: rHari, status: { in: KOLOM_PAPAN } },
      orderBy: { jamAcara: "asc" },
      select: { jamAcara: true },
    }),
    db.pesanan.count({ where: { tanggalAcara: rBesok, status: { not: "DIBATALKAN" } } }),
    db.pesanan.count({ where: { statusBayar: "MENUNGGU_VERIFIKASI", status: { not: "DIBATALKAN" } } }),
    denganUang
      ? db.pesanan.aggregate({
          where: { tanggalAcara: { lt: rHari.gte }, status: { not: "DIBATALKAN" }, statusBayar: { not: "LUNAS" } },
          _sum: { total: true, dibayar: true },
          _count: { _all: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    hariIni: { jumlah: jmlHari, jamPertama: pertama?.jamAcara ?? null },
    besok: { jumlah: jmlBesok, tanggal: besok },
    perluCek,
    piutangLewat: {
      jumlah: piutang?._count._all ?? 0,
      nilai: Math.max(0, (piutang?._sum.total ?? 0) - (piutang?._sum.dibayar ?? 0)),
    },
  };
}
