import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rentangHari } from "@/lib/laporan";
import { jamTampil, rupiah, tanggalPendek, teleponTampil } from "@/lib/format";
import { INFO_STATUS, INFO_BAYAR, LABEL_SUMBER } from "@/lib/pesanan";
import { LencanaBayar, LencanaStatus } from "@/components/Lencana";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import type { Prisma, StatusBayar, StatusPesanan, SumberPesanan } from "@/generated/prisma/client";
import { IkonTambah } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Semua pesanan" };

const UKURAN_HALAMAN = 25;
const SEMUA_STATUS = Object.keys(INFO_STATUS) as StatusPesanan[];
const SEMUA_BAYAR = Object.keys(INFO_BAYAR) as StatusBayar[];
const SEMUA_SUMBER = Object.keys(LABEL_SUMBER) as SumberPesanan[];
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

interface HalamanSemuaPesananProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    bayar?: string;
    sumber?: string;
    dari?: string;
    sampai?: string;
    halaman?: string;
  }>;
}

export default async function HalamanSemuaPesanan({ searchParams }: HalamanSemuaPesananProps) {
  const [params, sesi] = await Promise.all([searchParams, bacaSesi()]);
  const adalahPemilik = sesi?.peran === "PEMILIK";

  // Semua nilai dari URL disaring dulu: enum asing membuat Prisma melempar.
  const kataKunci = (params.q ?? "").trim().slice(0, 60);
  const status = SEMUA_STATUS.includes(params.status as StatusPesanan) ? (params.status as StatusPesanan) : undefined;
  const bayar = SEMUA_BAYAR.includes(params.bayar as StatusBayar) ? (params.bayar as StatusBayar) : undefined;
  const sumber = SEMUA_SUMBER.includes(params.sumber as SumberPesanan) ? (params.sumber as SumberPesanan) : undefined;
  const dari = POLA_TANGGAL.test(params.dari ?? "") ? params.dari : undefined;
  const sampai = POLA_TANGGAL.test(params.sampai ?? "") ? params.sampai : undefined;

  const where: Prisma.PesananWhereInput = {
    ...(status ? { status } : {}),
    ...(bayar ? { statusBayar: bayar } : {}),
    ...(sumber ? { sumber } : {}),
    ...(dari || sampai
      ? {
          tanggalAcara: {
            ...(dari ? { gte: rentangHari(dari).gte } : {}),
            ...(sampai ? { lt: rentangHari(sampai).lt } : {}),
          },
        }
      : {}),
    ...(kataKunci
      ? {
          OR: [
            { namaPemesan: { contains: kataKunci, mode: "insensitive" } },
            { kode: { contains: kataKunci, mode: "insensitive" } },
            { teleponPemesan: { contains: kataKunci.replace(/\D/g, "").replace(/^0/, "") || kataKunci } },
          ],
        }
      : {}),
  };

  const total = await db.pesanan.count({ where });
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halaman = Math.min(Math.max(1, Math.floor(Number(params.halaman) || 1)), totalHalaman);

  const [daftar, jumlahNilai] = await Promise.all([
    db.pesanan.findMany({
      where,
      select: {
        kode: true,
        namaPemesan: true,
        teleponPemesan: true,
        tanggalAcara: true,
        jamAcara: true,
        status: true,
        statusBayar: true,
        sumber: true,
        total: true,
        dibayar: true,
        item: { select: { namaMenu: true, jumlah: true }, take: 1 },
        _count: { select: { item: true } },
      },
      orderBy: [{ tanggalAcara: "desc" }, { jamAcara: "desc" }],
      skip: (halaman - 1) * UKURAN_HALAMAN,
      take: UKURAN_HALAMAN,
    }),
    adalahPemilik ? db.pesanan.aggregate({ where, _sum: { total: true } }) : Promise.resolve(null),
  ]);

  const adaSaringan = Boolean(kataKunci || status || bayar || sumber || dari || sampai);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">Semua pesanan</h1>
          <p className="teks-redup mt-1">
            {total.toLocaleString("id-ID")} pesanan
            {adalahPemilik && jumlahNilai?._sum.total ? ` · nilai ${rupiah(jumlahNilai._sum.total)}` : ""}
          </p>
        </div>
        <Link href="/admin/pesanan/baru" className="tombol-utama">
          <IkonTambah className="w-4 h-4" /> Catat pesanan
        </Link>
      </header>

      <form method="get" className="kartu mt-6 p-4 grid gap-3 grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] items-end">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="q" className="label">Cari</label>
          <input id="q" type="search" name="q" defaultValue={kataKunci} maxLength={60} placeholder="Nama, kode, nomor HP" className="isian" />
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="isian">
            <option value="">Semua</option>
            {SEMUA_STATUS.map((s) => (
              <option key={s} value={s}>{INFO_STATUS[s].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bayar" className="label">Pembayaran</label>
          <select id="bayar" name="bayar" defaultValue={bayar ?? ""} className="isian">
            <option value="">Semua</option>
            {SEMUA_BAYAR.map((b) => (
              <option key={b} value={b}>{INFO_BAYAR[b].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sumber" className="label">Sumber</label>
          <select id="sumber" name="sumber" defaultValue={sumber ?? ""} className="isian">
            <option value="">Semua</option>
            {SEMUA_SUMBER.map((x) => (
              <option key={x} value={x}>{LABEL_SUMBER[x]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dari" className="label">Acara dari</label>
          <input id="dari" type="date" name="dari" defaultValue={dari} className="isian" />
        </div>
        <div>
          <label htmlFor="sampai" className="label">Sampai</label>
          <input id="sampai" type="date" name="sampai" defaultValue={sampai} className="isian" />
        </div>
        <div className="col-span-2 lg:col-span-1 flex gap-2">
          <button type="submit" className="tombol-kedua">Terapkan</button>
          {adaSaringan && <Link href="/admin/pesanan" className="tombol-hantu">Reset</Link>}
        </div>
      </form>

      {daftar.length === 0 ? (
        <p className="kartu kartu-isi mt-6 text-center teks-redup">
          {adaSaringan ? "Tidak ada pesanan yang cocok dengan saringan ini." : "Belum ada pesanan."}
        </p>
      ) : (
        <div className="kartu mt-6 overflow-x-auto">
          <table className="tabel min-w-[760px]">
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Pemesan</th>
                <th scope="col">Acara</th>
                <th scope="col">Menu</th>
                {adalahPemilik && <th scope="col" className="text-right">Total</th>}
                <th scope="col">Status</th>
                <th scope="col">Bayar</th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.kode}>
                  <td>
                    <Link href={`/admin/pesanan/${p.kode}`} className="font-mono text-xs font-medium text-bata hover:underline">
                      {p.kode}
                    </Link>
                  </td>
                  <td>
                    <p className="font-medium text-kayu">{p.namaPemesan}</p>
                    <p className="text-xs text-kayu-sedang">
                      {teleponTampil(p.teleponPemesan)} · {LABEL_SUMBER[p.sumber]}
                    </p>
                  </td>
                  <td className="whitespace-nowrap">
                    {tanggalPendek(p.tanggalAcara)}
                    <span className="text-kayu-sedang"> · {jamTampil(p.jamAcara)}</span>
                  </td>
                  <td className="max-w-[220px]">
                    <p className="truncate">
                      {p.item[0] ? `${p.item[0].namaMenu} ×${p.item[0].jumlah}` : "—"}
                    </p>
                    {p._count.item > 1 && <p className="text-xs text-kayu-sedang">+{p._count.item - 1} menu lain</p>}
                  </td>
                  {adalahPemilik && (
                    <td className="text-right angka-tabel whitespace-nowrap">
                      {rupiah(p.total)}
                      {p.dibayar > 0 && p.dibayar < p.total && (
                        <span className="block text-xs text-kayu-sedang">sisa {rupiah(p.total - p.dibayar)}</span>
                      )}
                    </td>
                  )}
                  <td><LencanaStatus status={p.status} /></td>
                  <td><LencanaBayar statusBayar={p.statusBayar} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KomponenPaginasi
        halamanAktif={halaman}
        totalHalaman={totalHalaman}
        basePath="/admin/pesanan"
        queryLain={{ q: kataKunci || undefined, status, bayar, sumber, dari, sampai }}
      />
    </div>
  );
}
