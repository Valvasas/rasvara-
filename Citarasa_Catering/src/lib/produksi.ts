import { db } from "@/lib/db";
import { rentangHari } from "@/lib/laporan";
import { daftarBelanja, rekapProduksi, type BarisResep } from "@/lib/belanja";
import type { StatusPesanan } from "@/generated/prisma/client";

/** Batas jadwal yang ditampilkan per hari; dapur UMKM jarang melewatinya. */
export const BATAS_JADWAL = 300;

/**
 * Semua data produksi satu tanggal: porsi per menu, daftar belanja, dan
 * jadwal siap per pesanan. Pesanan "Baru" (belum diterima) bisa diikutkan,
 * misalnya saat pemilik belanja pagi sebelum sempat mengonfirmasi semuanya.
 */
export async function ambilProduksi(tanggal: string, sertakanBaru: boolean) {
  const status: StatusPesanan[] = ["DIKONFIRMASI", "DIPROSES", "SIAP", "SELESAI", ...(sertakanBaru ? (["BARU"] as const) : [])];
  const whereP = { tanggalAcara: rentangHari(tanggal), status: { in: status } };

  const [porsiMentah, jadwal, jumlahBaru] = await Promise.all([
    db.itemPesanan.groupBy({
      by: ["menuId", "namaMenu", "satuan"],
      where: { pesanan: whereP },
      _sum: { jumlah: true },
    }),
    db.pesanan.findMany({
      where: whereP,
      orderBy: [{ jamAcara: "asc" }, { kode: "asc" }],
      take: BATAS_JADWAL,
      select: {
        kode: true,
        namaPemesan: true,
        jamAcara: true,
        caraAmbil: true,
        alamatAntar: true,
        status: true,
        catatan: true,
        item: { select: { namaMenu: true, jumlah: true } },
      },
    }),
    sertakanBaru ? Promise.resolve(0) : db.pesanan.count({ where: { tanggalAcara: rentangHari(tanggal), status: "BARU" } }),
  ]);

  const porsi = rekapProduksi(
    porsiMentah.map((p) => ({ menuId: p.menuId, namaMenu: p.namaMenu, satuan: p.satuan, jumlah: p._sum.jumlah ?? 0 }))
  );

  const menuIds = porsi.map((p) => p.menuId).filter((x): x is string => Boolean(x));
  const resepMentah = menuIds.length
    ? await db.resepMenu.findMany({ where: { menuId: { in: menuIds } }, include: { bahan: true } })
    : [];
  const resep: BarisResep[] = resepMentah.map((r) => ({
    menuId: r.menuId,
    bahanId: r.bahanId,
    namaBahan: r.bahan.nama,
    satuan: r.bahan.satuan,
    hargaPerSatuan: r.bahan.hargaPerSatuan,
    jumlahPerPorsi: r.jumlahPerPorsi,
  }));

  return {
    porsi,
    belanja: daftarBelanja(porsi, resep),
    jadwal,
    jumlahBaruTertunda: jumlahBaru,
    totalPorsi: porsi.reduce((n, p) => n + p.jumlah, 0),
  };
}
