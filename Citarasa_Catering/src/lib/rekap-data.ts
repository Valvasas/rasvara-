import { db } from "@/lib/db";
import { dariInputTanggal, kunciHari, selisihHari, tanggalPanjang, teleponTampil } from "@/lib/format";
import { rentangBulan } from "@/lib/laporan";
import { bulanSebelumnya, labelBulan } from "@/lib/bulan";
import { ambilPengaturan } from "@/lib/pengaturan";
import { ambilMarginMenu, namaTerbaru, STATUS_PIUTANG } from "@/lib/insight-server";
import { INFO_UMUR, umurPiutang } from "@/lib/insight";
import { ambilProduksi } from "@/lib/produksi";
import { INFO_BAYAR, INFO_STATUS, LABEL_BAYAR, LABEL_SUMBER } from "@/lib/pesanan";
import type { DataProduksiXlsx, DataRekap, KpiRekap } from "@/lib/rekap-xlsx";

/** Batas baris lembar Pesanan/Kas: jauh di atas volume UMKM, mencegah berkas raksasa. */
const BATAS_BARIS = 20_000;

async function kpiBulan(bulan: string): Promise<KpiRekap> {
  const r = rentangBulan(bulan);
  const [selesai, batal, porsi, kas] = await Promise.all([
    db.pesanan.aggregate({ where: { status: "SELESAI", tanggalAcara: r }, _sum: { total: true }, _count: { _all: true } }),
    db.pesanan.count({ where: { status: "DIBATALKAN", tanggalAcara: r } }),
    db.itemPesanan.aggregate({ where: { pesanan: { status: "SELESAI", tanggalAcara: r } }, _sum: { jumlah: true } }),
    db.catatanKas.groupBy({ by: ["jenis"], where: { tanggal: r }, _sum: { jumlah: true } }),
  ]);
  return {
    nilaiPesananSelesai: selesai._sum.total ?? 0,
    pesananSelesai: selesai._count._all,
    pesananBatal: batal,
    porsiSelesai: porsi._sum.jumlah ?? 0,
    kasMasuk: kas.find((k) => k.jenis === "MASUK")?._sum.jumlah ?? 0,
    kasKeluar: kas.find((k) => k.jenis === "KELUAR")?._sum.jumlah ?? 0,
  };
}

/** Semua hari dalam bulan ("2026-09" → 30 kunci). */
function hariDalamBulan(bulan: string): string[] {
  const [t, b] = bulan.split("-").map(Number);
  const jumlah = new Date(Date.UTC(t, b, 0)).getUTCDate();
  return Array.from({ length: jumlah }, (_, i) => `${bulan}-${String(i + 1).padStart(2, "0")}`);
}

type BarisHarianSql = { tanggal: string; pesanan: number; porsi: number; nilai: bigint };
type BarisKasHarianSql = { tanggal: string; jenis: "MASUK" | "KELUAR"; jumlah: bigint };

/** Kumpulkan semua data rekap satu bulan langsung dari database (data asli). */
export async function kumpulkanDataRekap(bulan: string): Promise<DataRekap> {
  const r = rentangBulan(bulan);
  const lalu = bulanSebelumnya(bulan);

  const [pengaturan, kpi, kpiLalu, pengeluaran, harianPesanan, harianKas, pesanan, margin, saldoSebelum, kas, piutang, pelanggan] = await Promise.all([
    ambilPengaturan(),
    kpiBulan(bulan),
    kpiBulan(lalu),
    db.catatanKas.groupBy({ by: ["kategori"], where: { jenis: "KELUAR", tanggal: r }, _sum: { jumlah: true }, orderBy: { _sum: { jumlah: "desc" } } }),
    db.$queryRaw<BarisHarianSql[]>`
      SELECT x.tanggal, COUNT(*)::int AS pesanan, SUM(x.porsi)::int AS porsi, SUM(x.total)::bigint AS nilai
      FROM (
        SELECT to_char(p."tanggalAcara" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal,
               p.total,
               (SELECT COALESCE(SUM(i.jumlah), 0) FROM "ItemPesanan" i WHERE i."pesananId" = p.id) AS porsi
        FROM "Pesanan" p
        WHERE p.status = 'SELESAI' AND p."tanggalAcara" >= ${r.gte} AND p."tanggalAcara" < ${r.lt}
      ) x
      GROUP BY x.tanggal
    `,
    db.$queryRaw<BarisKasHarianSql[]>`
      SELECT to_char(k.tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal, k.jenis::text AS jenis, SUM(k.jumlah)::bigint AS jumlah
      FROM "CatatanKas" k
      WHERE k.tanggal >= ${r.gte} AND k.tanggal < ${r.lt}
      GROUP BY 1, 2
    `,
    db.pesanan.findMany({
      where: { tanggalAcara: r },
      orderBy: [{ tanggalAcara: "asc" }, { jamAcara: "asc" }, { kode: "asc" }],
      take: BATAS_BARIS,
      select: {
        kode: true, tanggalAcara: true, jamAcara: true, namaPemesan: true, teleponPemesan: true, sumber: true, status: true,
        statusBayar: true, caraBayar: true, subtotal: true, diskon: true, ongkir: true, total: true, dibayar: true,
      },
    }),
    ambilMarginMenu(r),
    db.catatanKas.groupBy({ by: ["jenis"], where: { tanggal: { lt: r.gte } }, _sum: { jumlah: true } }),
    db.catatanKas.findMany({
      where: { tanggal: r },
      orderBy: [{ tanggal: "asc" }, { dibuatPada: "asc" }],
      take: BATAS_BARIS,
      select: { tanggal: true, jenis: true, kategori: true, keterangan: true, jumlah: true, pesanan: { select: { kode: true } } },
    }),
    db.pesanan.findMany({
      where: { tanggalAcara: r, status: { in: STATUS_PIUTANG }, statusBayar: { not: "LUNAS" } },
      orderBy: { tanggalAcara: "asc" },
      take: BATAS_BARIS,
      select: { kode: true, namaPemesan: true, teleponPemesan: true, tanggalAcara: true, total: true, dibayar: true },
    }),
    db.pesanan.groupBy({
      by: ["teleponPemesan"],
      where: { tanggalAcara: r, status: { not: "DIBATALKAN" } },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 20,
    }),
  ]);

  const nama = await namaTerbaru(pelanggan.map((p) => p.teleponPemesan));
  const perHari = new Map(harianPesanan.map((h) => [h.tanggal, h]));
  const kasHari = new Map<string, { masuk: number; keluar: number }>();
  for (const k of harianKas) {
    const x = kasHari.get(k.tanggal) ?? { masuk: 0, keluar: 0 };
    if (k.jenis === "MASUK") x.masuk += Number(k.jumlah);
    else x.keluar += Number(k.jumlah);
    kasHari.set(k.tanggal, x);
  }
  const saldoMasuk = saldoSebelum.find((s) => s.jenis === "MASUK")?._sum.jumlah ?? 0;
  const saldoKeluar = saldoSebelum.find((s) => s.jenis === "KELUAR")?._sum.jumlah ?? 0;

  return {
    bulan,
    labelBulan: labelBulan(bulan),
    labelBulanLalu: labelBulan(lalu),
    namaUsaha: pengaturan.namaUsaha,
    dibuatPada: new Date(),
    kpi,
    kpiLalu,
    pengeluaranKategori: pengeluaran.map((p) => ({ kategori: p.kategori, jumlah: p._sum.jumlah ?? 0 })),
    harian: hariDalamBulan(bulan).map((t) => {
      const h = perHari.get(t);
      const k = kasHari.get(t);
      return { tanggal: t, pesanan: h?.pesanan ?? 0, porsi: h?.porsi ?? 0, nilai: Number(h?.nilai ?? 0), kasMasuk: k?.masuk ?? 0, kasKeluar: k?.keluar ?? 0 };
    }),
    pesanan: pesanan.map((p) => ({
      kode: p.kode,
      tanggalAcara: kunciHari(p.tanggalAcara),
      jamAcara: p.jamAcara,
      namaPemesan: p.namaPemesan,
      telepon: teleponTampil(p.teleponPemesan),
      sumber: LABEL_SUMBER[p.sumber],
      status: INFO_STATUS[p.status].label,
      statusBayar: INFO_BAYAR[p.statusBayar].label,
      caraBayar: LABEL_BAYAR[p.caraBayar],
      subtotal: p.subtotal,
      diskon: p.diskon,
      ongkir: p.ongkir,
      total: p.total,
      dibayar: p.dibayar,
    })),
    menu: margin.baris.map((m) => ({
      nama: m.nama,
      porsi: m.porsi,
      omzet: m.omzet,
      hpp: m.margin === null ? null : m.hpp,
      laba: m.laba,
      margin: m.margin,
      catatan: [
        m.margin === null ? "Belum ada resep" : "",
        m.hppPerkiraan ? "Sebagian HPP dari resep kini" : "",
        m.lakuTapiTipis ? "Laku tapi margin tipis (< 20%)" : "",
        m.margin !== null && m.omzetBerHpp < m.omzet ? "HPP hanya untuk sebagian porsi" : "",
      ]
        .filter(Boolean)
        .join("; "),
    })),
    saldoAwal: saldoMasuk - saldoKeluar,
    kas: kas.map((k) => ({
      tanggal: kunciHari(k.tanggal),
      jenis: k.jenis,
      kategori: k.kategori,
      keterangan: k.keterangan,
      kodePesanan: k.pesanan?.kode ?? "",
      jumlah: k.jumlah,
    })),
    piutang: piutang.map((p) => ({
      kode: p.kode,
      namaPemesan: p.namaPemesan,
      telepon: teleponTampil(p.teleponPemesan),
      tanggalAcara: kunciHari(p.tanggalAcara),
      total: p.total,
      dibayar: p.dibayar,
      umur: INFO_UMUR[umurPiutang(selisihHari(p.tanggalAcara))].label,
    })),
    pelangganTeratas: pelanggan.map((p) => ({
      nama: nama.get(p.teleponPemesan) ?? "Pelanggan",
      telepon: teleponTampil(p.teleponPemesan),
      pesanan: p._count._all,
      total: p._sum.total ?? 0,
    })),
  };
}

/** Data produksi satu tanggal untuk XLSX. Harga bahan hanya untuk pemilik (sama dengan halaman produksi). */
export async function kumpulkanDataProduksi(tanggal: string, sertakanBaru: boolean, denganHarga: boolean): Promise<DataProduksiXlsx> {
  const [pengaturan, data] = await Promise.all([ambilPengaturan(), ambilProduksi(tanggal, sertakanBaru)]);
  return {
    namaUsaha: pengaturan.namaUsaha,
    tanggal,
    labelTanggal: tanggalPanjang(dariInputTanggal(tanggal)),
    sertakanBaru,
    porsi: data.porsi,
    denganHarga,
    belanja: data.belanja.baris,
    tanpaResep: data.belanja.tanpaResep,
    jadwal: data.jadwal.map((j) => ({
      jamAcara: j.jamAcara,
      kode: j.kode,
      namaPemesan: j.namaPemesan,
      caraAmbil: j.caraAmbil,
      alamatAntar: j.alamatAntar,
      isi: j.item.map((i) => `${i.namaMenu} ×${i.jumlah}`).join(", "),
      catatan: j.catatan,
    })),
  };
}
