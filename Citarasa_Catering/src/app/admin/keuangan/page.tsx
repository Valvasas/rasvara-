import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { hariIniWib, rupiah, tanggalPendek } from "@/lib/format";
import { rentangBulan, ringkasanKas } from "@/lib/laporan";
import { FormCatatKas } from "@/components/admin/FormCatatKas";
import { TombolHapusKas } from "@/components/admin/TombolHapusKas";
import { KomponenPaginasi } from "@/components/KomponenPaginasi";
import { IkonUnduh } from "@/components/ikon/Ikon";
import type { JenisKas, Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Buku kas" };

const UKURAN_HALAMAN = 30;
const POLA_BULAN = /^\d{4}-(0[1-9]|1[0-2])$/;
const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function labelBulan(kunci: string) {
  const [t, b] = kunci.split("-").map(Number);
  return `${NAMA_BULAN[b - 1]} ${t}`;
}

interface HalamanBukuKasProps {
  searchParams: Promise<{ bulan?: string; jenis?: string; halaman?: string }>;
}

export default async function HalamanBukuKas({ searchParams }: HalamanBukuKasProps) {
  const sesi = await bacaSesi();
  if (sesi?.peran !== "PEMILIK") redirect("/admin");

  const params = await searchParams;
  const hariIni = hariIniWib();
  const bulan = POLA_BULAN.test(params.bulan ?? "") ? params.bulan! : hariIni.slice(0, 7);
  const jenis: JenisKas | undefined = params.jenis === "MASUK" || params.jenis === "KELUAR" ? params.jenis : undefined;
  const rentang = rentangBulan(bulan);

  const where: Prisma.CatatanKasWhereInput = { tanggal: rentang, ...(jenis ? { jenis } : {}) };

  const [ringkas, totalBaris, saldoSemua] = await Promise.all([
    ringkasanKas(rentang),
    db.catatanKas.count({ where }),
    db.catatanKas.groupBy({ by: ["jenis"], _sum: { jumlah: true } }),
  ]);
  const totalHalaman = Math.max(1, Math.ceil(totalBaris / UKURAN_HALAMAN));
  const halaman = Math.min(Math.max(1, Math.floor(Number(params.halaman) || 1)), totalHalaman);

  const daftar = await db.catatanKas.findMany({
    where,
    orderBy: [{ tanggal: "desc" }, { dibuatPada: "desc" }],
    include: { pesanan: { select: { kode: true } } },
    skip: (halaman - 1) * UKURAN_HALAMAN,
    take: UKURAN_HALAMAN,
  });

  const saldo =
    (saldoSemua.find((s) => s.jenis === "MASUK")?._sum.jumlah ?? 0) -
    (saldoSemua.find((s) => s.jenis === "KELUAR")?._sum.jumlah ?? 0);

  const hrefJenis = (j?: JenisKas) => `/admin/keuangan?bulan=${bulan}${j ? `&jenis=${j}` : ""}`;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">Buku kas</h1>
          <p className="teks-redup mt-1">
            Saldo keseluruhan <span className={`font-medium ${saldo < 0 ? "text-bahaya" : "text-kayu"}`}>{rupiah(saldo)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="get" className="flex gap-2">
            <label htmlFor="bulan" className="sr-only">Bulan</label>
            <input id="bulan" type="month" name="bulan" defaultValue={bulan} className="isian w-auto" />
            {jenis && <input type="hidden" name="jenis" value={jenis} />}
            <button type="submit" className="tombol-kedua">Tampilkan</button>
          </form>
          <a href={`/api/admin/ekspor-laporan?bulan=${bulan}`} download className="tombol-kedua">
            <IkonUnduh className="w-4 h-4" /> CSV
          </a>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="kartu p-5">
          <dt className="teks-redup">Masuk · {labelBulan(bulan)}</dt>
          <dd className="mt-1 text-2xl font-semibold text-daun-tua angka-tabel">{rupiah(ringkas.masuk)}</dd>
        </div>
        <div className="kartu p-5">
          <dt className="teks-redup">Keluar</dt>
          <dd className="mt-1 text-2xl font-semibold text-kayu angka-tabel">{rupiah(ringkas.keluar)}</dd>
        </div>
        <div className="kartu p-5">
          <dt className="teks-redup">Selisih</dt>
          <dd className={`mt-1 text-2xl font-semibold angka-tabel ${ringkas.selisih < 0 ? "text-bahaya" : "text-kayu"}`}>
            {rupiah(ringkas.selisih)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <section aria-labelledby="judul-transaksi" className="kartu overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-krem-gelap">
            <h2 id="judul-transaksi" className="judul-bagian">
              Transaksi <span className="text-kayu-sedang font-normal text-sm">({totalBaris})</span>
            </h2>
            <div className="flex gap-1">
              {[undefined, "MASUK", "KELUAR"].map((j) => (
                <Link
                  key={j ?? "semua"}
                  href={hrefJenis(j as JenisKas | undefined)}
                  aria-current={jenis === j ? "page" : undefined}
                  className={`pil min-h-[34px] px-3 ${jenis === j ? "pil-aktif" : ""}`}
                >
                  {j === "MASUK" ? "Masuk" : j === "KELUAR" ? "Keluar" : "Semua"}
                </Link>
              ))}
            </div>
          </div>

          {daftar.length === 0 ? (
            <p className="px-5 py-12 text-center teks-redup">Belum ada catatan di {labelBulan(bulan)}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tabel min-w-[560px]">
                <thead>
                  <tr>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Keterangan</th>
                    <th scope="col" className="text-right">Jumlah</th>
                    <th scope="col"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {daftar.map((k) => (
                    <tr key={k.id}>
                      <td className="whitespace-nowrap text-kayu-sedang">{tanggalPendek(k.tanggal)}</td>
                      <td>
                        <p className="text-kayu">{k.keterangan}</p>
                        <p className="text-xs text-kayu-sedang">
                          {k.kategori}
                          {k.pesanan && (
                            <>
                              {" · "}
                              <Link href={`/pesanan/${k.pesanan.kode}`} className="font-mono text-bata hover:underline">
                                {k.pesanan.kode}
                              </Link>
                            </>
                          )}
                        </p>
                      </td>
                      <td className={`text-right whitespace-nowrap angka-tabel font-medium ${k.jenis === "MASUK" ? "text-daun-tua" : "text-kayu"}`}>
                        {k.jenis === "MASUK" ? "+" : "−"}
                        {rupiah(k.jumlah)}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {k.sumber === "MANUAL" ? (
                          <TombolHapusKas id={k.id} />
                        ) : (
                          <span className="text-xs text-kayu-sedang" title="Tercatat otomatis dari pelunasan pesanan">Otomatis</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 pb-5">
            <KomponenPaginasi
              halamanAktif={halaman}
              totalHalaman={totalHalaman}
              basePath="/admin/keuangan"
              queryLain={{ bulan, jenis }}
            />
          </div>
        </section>

        <section aria-labelledby="judul-catat" className="kartu kartu-isi lg:sticky lg:top-8">
          <h2 id="judul-catat" className="judul-bagian mb-4">Catat manual</h2>
          <FormCatatKas hariIni={hariIni} />
          <p className="petunjuk mt-4">Pembayaran pesanan tercatat otomatis saat ditandai lunas.</p>
        </section>
      </div>
    </div>
  );
}
