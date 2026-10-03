import { db } from "@/lib/db";
import { hariIniWib, kunciHari, selisihHari } from "@/lib/format";
import { rentangHari } from "@/lib/laporan";
import {
  hitungMargin,
  rentangUmur,
  segmenkanPelanggan,
  umurPiutang,
  URUTAN_UMUR,
  type BarisMargin,
  type PelangganBersegmen,
  type Segmen,
  type UmurPiutang,
} from "@/lib/insight";
import { geserTanggal, hitungPerkiraan, MINGGU_RIWAYAT, type PesananRiwayat } from "@/lib/perkiraan";
import type { Prisma, StatusPesanan } from "@/generated/prisma/client";

/**
 * Pesanan yang sudah diterima dapur. Pesanan BARU belum dihitung sebagai
 * piutang: belum ada kesepakatan, bisa saja ditolak.
 */
export const STATUS_PIUTANG: StatusPesanan[] = ["DIKONFIRMASI", "DIPROSES", "SIAP", "SELESAI"];

/** Awal hari WIB, `jarak` hari dari hari ini. */
function awalHari(jarak: number): Date {
  return rentangHari(geserTanggal(hariIniWib(), jarak)).gte;
}

// ------------------------------------------------------------ Menu & margin

type BarisMarginSql = {
  kunci: string;
  menuId: string | null;
  nama: string;
  porsi: number;
  omzet: bigint;
  omzetSnap: bigint;
  hppSnap: bigint;
  porsiTanpa: number;
  omzetTanpa: bigint;
};

/**
 * Margin per menu untuk pesanan SELESAI pada rentang tanggal acara.
 * HPP diambil dari snapshot (`hppSatuan`) — angka saat pesanan dibuat. Item
 * lama tanpa snapshot memakai resep kini dan ditandai "perkiraan", supaya
 * pemilik yang baru mengisi resep tidak harus menunggu berbulan-bulan.
 */
export async function ambilMarginMenu(rentang: { gte: Date; lt: Date }) {
  const baris = await db.$queryRaw<BarisMarginSql[]>`
    SELECT COALESCE(i."menuId", 'nama:' || i."namaMenu") AS kunci,
           MAX(i."menuId") AS "menuId",
           MAX(i."namaMenu") AS nama,
           SUM(i.jumlah)::int AS porsi,
           SUM(i.subtotal)::bigint AS omzet,
           SUM(CASE WHEN i."hppSatuan" IS NOT NULL THEN i.subtotal ELSE 0 END)::bigint AS "omzetSnap",
           SUM(COALESCE(i."hppSatuan", 0)::bigint * i.jumlah)::bigint AS "hppSnap",
           SUM(CASE WHEN i."hppSatuan" IS NULL THEN i.jumlah ELSE 0 END)::int AS "porsiTanpa",
           SUM(CASE WHEN i."hppSatuan" IS NULL THEN i.subtotal ELSE 0 END)::bigint AS "omzetTanpa"
    FROM "ItemPesanan" i
    JOIN "Pesanan" p ON p.id = i."pesananId"
    WHERE p.status = 'SELESAI' AND p."tanggalAcara" >= ${rentang.gte} AND p."tanggalAcara" < ${rentang.lt}
    GROUP BY 1
    ORDER BY omzet DESC
  `;

  const perluResep = baris.filter((b) => b.porsiTanpa > 0 && b.menuId).map((b) => b.menuId!);
  const resep = perluResep.length
    ? await db.resepMenu.findMany({
        where: { menuId: { in: perluResep }, bahan: { aktif: true } },
        select: { menuId: true, jumlahPerPorsi: true, bahan: { select: { hargaPerSatuan: true } } },
      })
    : [];
  const hppKini = new Map<string, number>();
  for (const r of resep) hppKini.set(r.menuId, (hppKini.get(r.menuId) ?? 0) + r.jumlahPerPorsi * r.bahan.hargaPerSatuan);

  const data: BarisMargin[] = baris.map((b) => {
    let omzetBerHpp = Number(b.omzetSnap);
    let hpp = Number(b.hppSnap);
    let hppPerkiraan = false;
    const kini = b.menuId ? hppKini.get(b.menuId) : undefined;
    if (b.porsiTanpa > 0 && kini !== undefined) {
      omzetBerHpp += Number(b.omzetTanpa);
      hpp += Math.round(kini) * b.porsiTanpa;
      hppPerkiraan = true;
    }
    return { menuId: b.kunci, nama: b.nama, porsi: b.porsi, omzet: Number(b.omzet), omzetBerHpp, hpp, hppPerkiraan };
  });

  const hasil = hitungMargin(data);
  const total = hasil.reduce(
    (t, b) => ({ omzet: t.omzet + b.omzet, omzetBerHpp: t.omzetBerHpp + b.omzetBerHpp, hpp: t.hpp + b.hpp }),
    { omzet: 0, omzetBerHpp: 0, hpp: 0 }
  );
  return { baris: hasil, total, idMenu: new Map(baris.map((b) => [b.kunci, b.menuId])) };
}

// ---------------------------------------------------------------- Pelanggan

export const HARI_PENGAMATAN_PELANGGAN = 365;

/**
 * Semua pelanggan 12 bulan terakhir, disegmentasi. Agregasi di database
 * (satu baris per nomor HP), jadi tetap ringan walau pesanannya puluhan ribu.
 * Pesanan mendatang ikut dihitung: pelanggan yang sudah pesan untuk minggu
 * depan jelas masih aktif.
 */
export async function ambilSegmenPelanggan(): Promise<PelangganBersegmen[]> {
  const grup = await db.pesanan.groupBy({
    by: ["teleponPemesan"],
    where: { status: { not: "DIBATALKAN" }, tanggalAcara: { gte: awalHari(-HARI_PENGAMATAN_PELANGGAN) } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { tanggalAcara: true },
  });
  return segmenkanPelanggan(
    grup.map((g) => ({
      telepon: g.teleponPemesan,
      hariSejakTerakhir: g._max.tanggalAcara ? Math.max(0, -selisihHari(g._max.tanggalAcara)) : HARI_PENGAMATAN_PELANGGAN,
      frekuensi: g._count._all,
      nilai: g._sum.total ?? 0,
    }))
  );
}

/** Nama terbaru per nomor (orang bisa menulis namanya berbeda di tiap pesanan). */
export async function namaTerbaru(telepon: string[]): Promise<Map<string, string>> {
  if (!telepon.length) return new Map();
  const baris = await db.pesanan.findMany({
    where: { teleponPemesan: { in: telepon } },
    orderBy: [{ teleponPemesan: "asc" }, { tanggalAcara: "desc" }],
    distinct: ["teleponPemesan"],
    select: { teleponPemesan: true, namaPemesan: true },
  });
  return new Map(baris.map((b) => [b.teleponPemesan, b.namaPemesan]));
}

export function hitungPerSegmen(daftar: PelangganBersegmen[]): Record<Segmen, { jumlah: number; nilai: number }> {
  const hasil = {
    ANDALAN: { jumlah: 0, nilai: 0 },
    SETIA: { jumlah: 0, nilai: 0 },
    BARU: { jumlah: 0, nilai: 0 },
    PERLU_DISAPA: { jumlah: 0, nilai: 0 },
    HILANG: { jumlah: 0, nilai: 0 },
  } satisfies Record<Segmen, { jumlah: number; nilai: number }>;
  for (const p of daftar) {
    hasil[p.segmen].jumlah++;
    hasil[p.segmen].nilai += p.nilai;
  }
  return hasil;
}

// ------------------------------------------------------------------ Piutang

function filterUmur(umur: UmurPiutang): Prisma.DateTimeFilter {
  const { dari, sampai } = rentangUmur(umur);
  return {
    ...(dari !== null ? { gte: awalHari(dari) } : {}),
    ...(sampai !== null ? { lt: awalHari(sampai) } : {}),
  };
}

const DASAR_PIUTANG: Prisma.PesananWhereInput = { status: { in: STATUS_PIUTANG }, statusBayar: { not: "LUNAS" } };

/** Total sisa tagihan per kelompok umur. */
export async function ringkasanPiutang() {
  const hasil = await Promise.all(
    URUTAN_UMUR.map(async (umur) => {
      const a = await db.pesanan.aggregate({
        where: { ...DASAR_PIUTANG, tanggalAcara: filterUmur(umur) },
        _sum: { total: true, dibayar: true },
        _count: { _all: true },
      });
      return { umur, jumlah: a._count._all, sisa: Math.max(0, (a._sum.total ?? 0) - (a._sum.dibayar ?? 0)) };
    })
  );
  return hasil;
}

/** Daftar piutang; "LEWAT" = semua yang acaranya sudah lewat (bawaan). */
export async function daftarPiutang(umur: UmurPiutang | "LEWAT", halaman: number, ukuran: number) {
  const where: Prisma.PesananWhereInput = {
    ...DASAR_PIUTANG,
    tanggalAcara: umur === "LEWAT" ? { lt: awalHari(0) } : filterUmur(umur),
  };
  const [total, baris] = await Promise.all([
    db.pesanan.count({ where }),
    db.pesanan.findMany({
      where,
      orderBy: [{ tanggalAcara: "asc" }, { jamAcara: "asc" }],
      skip: (halaman - 1) * ukuran,
      take: ukuran,
      select: {
        kode: true,
        namaPemesan: true,
        teleponPemesan: true,
        tanggalAcara: true,
        jamAcara: true,
        caraAmbil: true,
        status: true,
        total: true,
        dibayar: true,
        minimalDp: true,
      },
    }),
  ]);
  return { total, baris: baris.map((b) => ({ ...b, umur: umurPiutang(selisihHari(b.tanggalAcara)) })) };
}

/** Pesanan batal yang uangnya sudah masuk: wajib dikembalikan. */
export async function daftarPerluRefund() {
  return db.pesanan.findMany({
    where: { status: "DIBATALKAN", dibayar: { gt: 0 } },
    orderBy: { diubahPada: "desc" },
    take: 50,
    select: { kode: true, namaPemesan: true, tanggalAcara: true, dibayar: true },
  });
}

// ---------------------------------------------------------------- Perkiraan

type BarisPorsiSql = { tanggal: string; dipesanPada: string; porsi: number };

/** Porsi per pesanan (tidak batal), dengan tanggal acara & tanggal pesan dalam WIB. */
async function porsiPerPesanan(dari: Date, sampai: Date): Promise<PesananRiwayat[]> {
  return db.$queryRaw<BarisPorsiSql[]>`
    SELECT to_char(p."tanggalAcara" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tanggal,
           to_char(p."dibuatPada" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS "dipesanPada",
           SUM(i.jumlah)::int AS porsi
    FROM "Pesanan" p
    JOIN "ItemPesanan" i ON i."pesananId" = p.id
    WHERE p.status <> 'DIBATALKAN' AND p."tanggalAcara" >= ${dari} AND p."tanggalAcara" < ${sampai}
    GROUP BY p.id
  `;
}

export async function ambilPerkiraan() {
  const hariIni = hariIniWib();
  const [riwayat, mendatang, pertama] = await Promise.all([
    porsiPerPesanan(awalHari(-MINGGU_RIWAYAT * 7), awalHari(0)),
    porsiPerPesanan(awalHari(1), awalHari(8)),
    db.pesanan.findFirst({ where: { status: { not: "DIBATALKAN" } }, orderBy: { tanggalAcara: "asc" }, select: { tanggalAcara: true } }),
  ]);
  const pertamaKali = pertama ? kunciHari(pertama.tanggalAcara) : null;
  return { hariIni, ...hitungPerkiraan({ riwayat, mendatang, hariIni, pertamaKali }) };
}
