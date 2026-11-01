import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { kodePesananPerangkatIni } from "@/lib/akses-pesanan";
import { dataKeranjangDariMenu } from "@/lib/menu";
import { jamTampil, labelHari, rupiah, tanggalPendek } from "@/lib/format";
import { LencanaStatus } from "@/components/Lencana";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { IlustrasiPesananKosong } from "@/components/ilustrasi/Ilustrasi";
import { TombolPesanLagi } from "@/components/toko/AksiPesananPembeli";
import { GambarMini } from "@/components/toko/IsiKeranjang";
import { IkonKalender } from "@/components/ikon/Ikon";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Pesanan saya", robots: { index: false } };

const UKURAN_HALAMAN = 10;

const TAB = [
  { kunci: "semua", label: "Semua" },
  { kunci: "bayar", label: "Belum bayar" },
  { kunci: "berjalan", label: "Berjalan" },
  { kunci: "selesai", label: "Selesai" },
  { kunci: "batal", label: "Dibatalkan" },
] as const;
type KunciTab = (typeof TAB)[number]["kunci"];

const SARINGAN_TAB: Record<KunciTab, Prisma.PesananWhereInput> = {
  semua: {},
  // "Belum bayar" hanya untuk transfer: pesanan tunai memang dibayar saat diterima.
  bayar: { status: { not: "DIBATALKAN" }, statusBayar: { not: "LUNAS" }, caraBayar: "TRANSFER" },
  berjalan: { status: { in: ["BARU", "DIKONFIRMASI", "DIPROSES", "SIAP"] } },
  selesai: { status: "SELESAI" },
  batal: { status: "DIBATALKAN" },
};

interface HalamanRiwayatProps {
  searchParams: Promise<{ halaman?: string; tab?: string }>;
}

export default async function HalamanRiwayat({ searchParams }: HalamanRiwayatProps) {
  const [sesi, params, kodePerangkat] = await Promise.all([bacaSesi(), searchParams, kodePesananPerangkatIni()]);

  // Tamu (belum login) tetap bisa melihat pesanan yang dibuat dari perangkat ini —
  // haknya berasal dari cookie bertanda tangan, sama seperti halaman detail.
  const dasar: Prisma.PesananWhereInput = sesi ? { penggunaId: sesi.id } : { kode: { in: kodePerangkat } };
  const tab: KunciTab = TAB.some((t) => t.kunci === params.tab) ? (params.tab as KunciTab) : "semua";
  const where: Prisma.PesananWhereInput = { AND: [dasar, SARINGAN_TAB[tab]] };
  const diminta = Math.max(1, Math.floor(Number(params.halaman) || 1));

  const punyaSesuatu = Boolean(sesi) || kodePerangkat.length > 0;
  const hitungan = punyaSesuatu
    ? await Promise.all(TAB.map((t) => db.pesanan.count({ where: { AND: [dasar, SARINGAN_TAB[t.kunci]] } })))
    : TAB.map(() => 0);
  const total = hitungan[TAB.findIndex((t) => t.kunci === tab)];
  const totalHalaman = Math.max(1, Math.ceil(total / UKURAN_HALAMAN));
  const halaman = Math.min(diminta, totalHalaman);

  const daftar = punyaSesuatu
    ? await db.pesanan.findMany({
        where,
        select: {
          kode: true,
          tanggalAcara: true,
          jamAcara: true,
          dibuatPada: true,
          status: true,
          statusBayar: true,
          caraBayar: true,
          total: true,
          item: {
            select: {
              id: true,
              namaMenu: true,
              jumlah: true,
              satuan: true,
              menu: {
                select: {
                  id: true,
                  slug: true,
                  nama: true,
                  harga: true,
                  satuan: true,
                  minPesan: true,
                  preorderHari: true,
                  aktif: true,
                  foto: { select: { url: true }, orderBy: { urutan: "asc" }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { dibuatPada: "desc" },
        skip: (halaman - 1) * UKURAN_HALAMAN,
        take: UKURAN_HALAMAN,
      })
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-5 pb-10 sm:pt-10 sm:pb-14">
      <h1 className="font-tampil text-[1.75rem] sm:text-4xl font-bold text-kayu">Pesanan saya</h1>
      {!sesi && kodePerangkat.length > 0 && (
        <p className="mt-3 kotak-info bg-kunyit-lembut/70 border-kunyit/30 text-kunyit-tua">
          Ini pesanan yang dibuat dari perangkat ini.{" "}
          <Link href="/masuk?ke=/riwayat" className="font-bold underline">
            Masuk
          </Link>{" "}
          supaya tersimpan di akun dan bisa dibuka dari HP lain.
        </p>
      )}

      {/* Tab status ala marketplace */}
      <nav aria-label="Saring status pesanan" className="sticky top-16 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 mt-4 bg-krem/95 backdrop-blur-md border-b border-krem-gelap">
        <ul className="flex gap-1 overflow-x-auto tanpa-scrollbar">
          {TAB.map((t, i) => {
            const aktif = t.kunci === tab;
            return (
              <li key={t.kunci} className="shrink-0">
                <Link
                  href={t.kunci === "semua" ? "/riwayat" : `/riwayat?tab=${t.kunci}`}
                  aria-current={aktif ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 min-h-[48px] px-3 text-[15px] font-semibold transition-colors ${
                    aktif ? "text-bata-tua" : "text-kayu-sedang hover:text-kayu"
                  }`}
                >
                  {t.label}
                  {hitungan[i] > 0 && t.kunci !== "semua" && (
                    <span
                      className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] leading-[22px] text-center angka-tabel ${
                        t.kunci === "bayar" ? "bg-bata text-white" : "bg-kayu-lembut text-kayu"
                      }`}
                    >
                      {hitungan[i]}
                    </span>
                  )}
                  {aktif && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-bata anim-masuk-skala" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {daftar.length === 0 ? (
        <div className="kartu kartu-isi mt-6 text-center anim-masuk">
          <IlustrasiPesananKosong className="w-52 mx-auto" />
          <p className="mt-2 text-lg font-bold text-kayu">
            {tab === "semua" ? "Belum ada pesanan" : "Tidak ada pesanan di sini"}
          </p>
          <p className="teks-redup mt-1 max-w-sm mx-auto">
            {sesi
              ? "Pesanan yang kamu buat saat masuk dengan akun ini akan muncul di sini."
              : "Pesanan dari perangkat lain? Lacak dengan kode pesanan dan nomor WhatsApp."}
          </p>
          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/menu" className="tombol-utama">
              Mulai belanja
            </Link>
            <Link href="/lacak" className="tombol-kedua">
              Lacak dengan kode
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {daftar.map((p, idx) => {
            const pertama = p.item[0];
            const lainnya = p.item.length - 1;
            const perluBayar = p.caraBayar === "TRANSFER" && p.statusBayar !== "LUNAS" && p.status !== "DIBATALKAN";
            const bisaPesanLagi = p.item.flatMap((it) =>
              it.menu && it.menu.aktif
                ? [{ menu: dataKeranjangDariMenu(it.menu), jumlah: Math.max(it.menu.minPesan, it.jumlah) }]
                : []
            );
            return (
              <li key={p.kode} className="kartu overflow-hidden anim-masuk" style={{ ["--tunda" as string]: `${idx * 40}ms` }}>
                <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-krem-gelap bg-krem-tua/40">
                  <span className="text-[13px] text-kayu-sedang">
                    Dipesan {tanggalPendek(p.dibuatPada)} · <span className="font-mono">{p.kode}</span>
                  </span>
                  <LencanaStatus status={p.status} untukPelanggan />
                </div>
                <Link href={`/pesanan/${p.kode}`} className="flex gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-krem/60 transition-colors">
                  <GambarMini url={pertama?.menu?.foto[0]?.url ?? null} nama={pertama?.namaMenu ?? ""} ukuran="w-16 h-16" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-kayu leading-snug line-clamp-1">{pertama?.namaMenu}</p>
                    <p className="text-[14px] text-kayu-sedang">
                      {pertama?.jumlah} {pertama?.satuan}
                      {lainnya > 0 && ` · +${lainnya} menu lain`}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-[14px] text-kayu">
                      <IkonKalender className="w-4 h-4 text-kayu-sedang" />
                      {labelHari(p.tanggalAcara)}, {tanggalPendek(p.tanggalAcara)} · {jamTampil(p.jamAcara)}
                    </p>
                  </div>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-krem-gelap">
                  <p className="text-[14px] text-kayu-sedang">
                    Total <span className="text-lg font-bold text-kayu angka-tabel">{rupiah(p.total)}</span>
                  </p>
                  <div className="flex gap-2">
                    {perluBayar ? (
                      <Link href={`/pesanan/${p.kode}`} className="tombol-utama tombol-kecil">
                        {p.statusBayar === "MENUNGGU_VERIFIKASI" ? "Lihat pembayaran" : "Bayar sekarang"}
                      </Link>
                    ) : (
                      <Link href={`/pesanan/${p.kode}`} className="tombol-kedua tombol-kecil">
                        Lihat detail
                      </Link>
                    )}
                    {(p.status === "SELESAI" || p.status === "DIBATALKAN") && (
                      <TombolPesanLagi
                        item={bisaPesanLagi}
                        jumlahTakTersedia={p.item.length - bisaPesanLagi.length}
                        kelas="tombol-garis tombol-kecil"
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <KomponenPaginasi
        halamanAktif={halaman}
        totalHalaman={totalHalaman}
        basePath="/riwayat"
        queryLain={{ tab: tab === "semua" ? undefined : tab }}
      />
    </div>
  );
}
