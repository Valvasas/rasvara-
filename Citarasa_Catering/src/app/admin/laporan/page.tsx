import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib } from "@/lib/format";
import { labelBulan, POLA_BULAN } from "@/lib/bulan";
import { URUTAN_SEGMEN, URUTAN_UMUR, type Segmen, type UmurPiutang } from "@/lib/insight";
import { IkonUnduh } from "@/components/ikon/Ikon";
import { TabRingkasan } from "./_tab/Ringkasan";
import { TabMenuMargin } from "./_tab/MenuMargin";
import { TabPelanggan } from "./_tab/Pelanggan";
import { TabPiutang } from "./_tab/Piutang";
import { TabPerkiraan } from "./_tab/Perkiraan";
import { TabArsip } from "./_tab/Arsip";

export const metadata: Metadata = { title: "Laporan & insight" };

const TAB = [
  { id: "ringkasan", label: "Ringkasan", pakaiBulan: true, keterangan: null },
  { id: "menu", label: "Menu & margin", pakaiBulan: true, keterangan: null },
  { id: "pelanggan", label: "Pelanggan", pakaiBulan: false, keterangan: "12 bulan terakhir" },
  { id: "piutang", label: "Piutang", pakaiBulan: false, keterangan: "Posisi hari ini" },
  { id: "perkiraan", label: "Perkiraan", pakaiBulan: false, keterangan: "7 hari ke depan" },
  { id: "arsip", label: "Rekap Excel", pakaiBulan: false, keterangan: "Unduh & arsip bulanan" },
] as const;
type IdTab = (typeof TAB)[number]["id"];

interface HalamanLaporanProps {
  searchParams: Promise<{ tab?: string; bulan?: string; halaman?: string; seg?: string; umur?: string }>;
}

export default async function HalamanLaporan({ searchParams }: HalamanLaporanProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const params = await searchParams;
  // Semua nilai dari URL disaring ke daftar yang dikenal; nilai asing jatuh ke bawaan.
  const tab = TAB.find((t) => t.id === params.tab) ?? TAB[0];
  const bulan = POLA_BULAN.test(params.bulan ?? "") ? params.bulan! : hariIniWib().slice(0, 7);
  const halaman = Math.min(10_000, Math.max(1, Math.floor(Number(params.halaman) || 1)));
  const segmen = URUTAN_SEGMEN.includes(params.seg as Segmen) ? (params.seg as Segmen) : null;
  const umur = URUTAN_UMUR.includes(params.umur as UmurPiutang) ? (params.umur as UmurPiutang) : null;

  const hrefTab = (id: IdTab) => {
    const t = TAB.find((x) => x.id === id)!;
    return `/admin/laporan?tab=${id}${t.pakaiBulan ? `&bulan=${bulan}` : ""}`;
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">Laporan &amp; insight</h1>
          <p className="teks-redup mt-1">{tab.pakaiBulan ? labelBulan(bulan) : tab.keterangan}</p>
        </div>
        {tab.pakaiBulan && (
          <div className="flex flex-wrap gap-2">
            <form method="get" className="flex gap-2">
              <input type="hidden" name="tab" value={tab.id} />
              <label htmlFor="bulan" className="sr-only">Bulan</label>
              <input id="bulan" type="month" name="bulan" defaultValue={bulan} className="isian w-auto" />
              <button type="submit" className="tombol-kedua">Tampilkan</button>
            </form>
            <a href={`/api/admin/rekap-bulanan?bulan=${bulan}`} className="tombol-utama">
              <IkonUnduh className="w-4 h-4" /> Rekap Excel
            </a>
            <a href={`/api/admin/ekspor-laporan?bulan=${bulan}`} download className="tombol-hantu" title="Data kas mentah (CSV)">
              CSV
            </a>
          </div>
        )}
      </header>

      {/* Tab = tautan biasa (bisa dibuka di tab baru, dibagikan, dan tombol Kembali bekerja). */}
      <nav aria-label="Jenis laporan" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 pb-1">
          {TAB.map((t) => (
            <li key={t.id}>
              <Link href={hrefTab(t.id)} aria-current={t.id === tab.id ? "page" : undefined} className={`pil ${t.id === tab.id ? "pil-aktif" : ""}`}>
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {tab.id === "ringkasan" && <TabRingkasan bulan={bulan} />}
        {tab.id === "menu" && <TabMenuMargin bulan={bulan} halaman={halaman} />}
        {tab.id === "pelanggan" && <TabPelanggan segmen={segmen} halaman={halaman} />}
        {tab.id === "piutang" && <TabPiutang umur={umur} halaman={halaman} />}
        {tab.id === "perkiraan" && <TabPerkiraan />}
        {tab.id === "arsip" && <TabArsip bulanIni={hariIniWib().slice(0, 7)} halaman={halaman} />}
      </div>
    </div>
  );
}
