import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { ambilDenyut } from "@/lib/denyut";
import { rentangHari } from "@/lib/laporan";
import { alamatSitus } from "@/lib/situs";
import { ambilPengaturan, kekuranganPengaturan } from "@/lib/pengaturan";
import {
  dariInputTanggal,
  hariIniWib,
  jamTampil,
  kunciHari,
  namaPanggilan,
  rupiah,
  sapaanWaktu,
  sedangBuka,
  tanggalPanjang,
} from "@/lib/format";
import { LencanaBayar, LencanaStatus } from "@/components/Lencana";
import { IlustrasiKoki } from "@/components/ilustrasi/Ilustrasi";
import { PemantauPapan } from "@/components/admin/PemantauPesanan";
import { TombolBagikanToko } from "@/components/admin/TombolBagikanToko";
import {
  IkonApi,
  IkonDompet,
  IkonLampiran,
  IkonLonceng,
  IkonMangkuk,
  IkonPanahKanan,
  IkonPeringatan,
  IkonTambah,
  IkonTiket,
  IkonToko,
  IkonTruk,
  IkonWajan,
} from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Beranda" };

function geser(kunci: string, hari: number): string {
  return kunciHari(new Date(dariInputTanggal(kunci).getTime() + hari * 86_400_000));
}

/** Persentase perubahan yang aman dari pembagian nol. */
function selisihPersen(sekarang: number, kemarin: number): number | null {
  if (kemarin === 0) return sekarang === 0 ? 0 : null;
  return Math.round(((sekarang - kemarin) / kemarin) * 100);
}

const NAMA_HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default async function BerandaDapur() {
  const [sesi, pengaturan] = await Promise.all([bacaSesi(), ambilPengaturan()]);
  const pemilik = sesi?.peran === "PEMILIK";
  const hariIni = hariIniWib();
  const besok = geser(hariIni, 1);
  const tujuhHariLalu = geser(hariIni, -6);
  const sejak30 = new Date(Date.now() - 30 * 86_400_000);

  const [denyut, untukHariIni, belumLunas, jadwal, terlaris, perHari, rata30] = await Promise.all([
    ambilDenyut(pemilik),
    db.pesanan.count({
      where: { tanggalAcara: rentangHari(hariIni), status: { notIn: ["SELESAI", "DIBATALKAN"] } },
    }),
    pemilik
      ? db.pesanan.count({
          where: { caraBayar: "TRANSFER", statusBayar: "BELUM_BAYAR", status: { notIn: ["DIBATALKAN"] } },
        })
      : Promise.resolve(0),
    db.pesanan.findMany({
      where: {
        tanggalAcara: { gte: rentangHari(hariIni).gte, lt: rentangHari(besok).lt },
        status: { notIn: ["SELESAI", "DIBATALKAN"] },
      },
      select: {
        kode: true,
        namaPemesan: true,
        tanggalAcara: true,
        jamAcara: true,
        status: true,
        statusBayar: true,
        caraAmbil: true,
        total: true,
        item: { select: { namaMenu: true, jumlah: true }, take: 2 },
        _count: { select: { item: true } },
      },
      orderBy: [{ tanggalAcara: "asc" }, { jamAcara: "asc" }],
      take: 10,
    }),
    db.itemPesanan.groupBy({
      by: ["namaMenu"],
      where: { pesanan: { dibuatPada: { gte: sejak30 }, status: { not: "DIBATALKAN" } } },
      _sum: { jumlah: true },
      orderBy: { _sum: { jumlah: "desc" } },
      take: 5,
    }),
    // Dikelompokkan per hari WIB langsung di database: tidak ada ribuan baris
    // pesanan yang ditarik ke aplikasi hanya untuk dijumlahkan.
    pemilik
      ? db.$queryRaw<{ hari: string; jumlah: number; omzet: bigint }[]>`
          SELECT to_char(("dibuatPada" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS hari,
                 COUNT(*)::int AS jumlah,
                 COALESCE(SUM("total"), 0)::bigint AS omzet
          FROM "Pesanan"
          WHERE "dibuatPada" >= ${rentangHari(tujuhHariLalu).gte} AND "status" <> 'DIBATALKAN'
          GROUP BY 1`
      : Promise.resolve([]),
    pemilik
      ? db.pesanan.aggregate({ where: { dibuatPada: { gte: sejak30 }, status: { not: "DIBATALKAN" } }, _avg: { total: true } })
      : Promise.resolve(null),
  ]);

  // Diurutkan ulang per (hari WIB, jam) — kolom tanggal bisa menyimpan jam
  // berbeda dalam satu hari (data lama/impor), dan dapur membaca per jam siap.
  jadwal.sort((a, b) => {
    const ka = `${kunciHari(a.tanggalAcara)} ${a.jamAcara}`;
    const kb = `${kunciHari(b.tanggalAcara)} ${b.jamAcara}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  // Tujuh hari berurutan, hari tanpa pesanan tetap tampil sebagai nol.
  const hariGrafik = Array.from({ length: 7 }, (_, i) => geser(tujuhHariLalu, i));
  const petaHari = new Map(perHari.map((b) => [b.hari, { jumlah: b.jumlah, omzet: Number(b.omzet) }]));
  const seri = hariGrafik.map((k) => ({ kunci: k, ...(petaHari.get(k) ?? { jumlah: 0, omzet: 0 }) }));
  const ini = seri[6];
  const kemarin = seri[5];
  const total7 = seri.reduce((n, s) => n + s.omzet, 0);
  const puncak = Math.max(1, ...seri.map((s) => s.omzet));
  const persenOmzet = selisihPersen(ini.omzet, kemarin.omzet);
  const kurang = pemilik ? kekuranganPengaturan(pengaturan) : [];
  const puncakTerlaris = Math.max(1, ...terlaris.map((t) => t._sum.jumlah ?? 0));
  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);

  const tugas = [
    { label: "Pesanan baru", nilai: denyut.baru, href: "/admin/papan", Ikon: IkonLonceng, nada: "bata", ket: "perlu diterima" },
    ...(pemilik
      ? [{ label: "Cek pembayaran", nilai: denyut.cekBayar, href: "/admin/papan?bayar=cek", Ikon: IkonLampiran, nada: "kunyit", ket: "bukti transfer masuk" }]
      : []),
    { label: "Untuk hari ini", nilai: untukHariIni, href: "/admin/papan?rentang=hari-ini", Ikon: IkonWajan, nada: "kayu", ket: "belum selesai" },
    { label: "Siap diserahkan", nilai: denyut.siap, href: "/admin/pesanan?status=SIAP", Ikon: IkonTruk, nada: "daun", ket: "antar / diambil" },
    ...(pemilik
      ? [{ label: "Belum transfer", nilai: belumLunas, href: "/admin/pesanan?bayar=BELUM_BAYAR&cara=TRANSFER&aktif=1", Ikon: IkonDompet, nada: "kayu", ket: "bisa diingatkan via WA" }]
      : []),
  ] as const;

  const NADA: Record<string, string> = {
    bata: "bg-bata-lembut text-bata-tua",
    kunyit: "bg-kunyit-lembut text-kunyit-tua",
    daun: "bg-daun-lembut text-daun-tua",
    kayu: "bg-kayu-lembut text-kayu",
  };

  return (
    <div className="space-y-6">
      <PemantauPapan />

      {/* Sapaan */}
      <section className="relative overflow-hidden rounded-3xl permukaan-hangat border border-krem-gelap p-5 sm:p-7 flex items-center gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-kayu-sedang">{tanggalPanjang(new Date())}</p>
          <h1 className="mt-1 font-tampil text-2xl sm:text-3xl font-bold text-kayu leading-tight">
            {sapaanWaktu()}, {namaPanggilan(sesi?.nama ?? "")}!
          </h1>
          <p className="mt-2 text-[15px] text-kayu-sedang">
            {denyut.baru > 0
              ? `Ada ${denyut.baru} pesanan baru menunggu jawabanmu.`
              : untukHariIni > 0
              ? `${untukHariIni} pesanan dijadwalkan hari ini. Semangat masaknya!`
              : "Belum ada pesanan yang menunggu. Saatnya bagikan menu ke pelanggan."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-krem-gelap px-3 py-1.5 text-[13px] font-semibold text-kayu">
              <span className={`w-2 h-2 rounded-full ${buka ? "bg-daun anim-denyut" : "bg-kayu-sedang"}`} />
              {buka ? "Jam layanan sedang buka" : `Buka ${jamTampil(pengaturan.jamBuka)} WIB`}
            </span>
            <Link href="/admin/papan" className="tombol-utama tombol-kecil">
              Buka papan pesanan
              <IkonPanahKanan className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <IlustrasiKoki className="hidden sm:block w-40 lg:w-48 shrink-0" />
      </section>

      {kurang.length > 0 && (
        <div className="kotak-peringatan flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-start gap-2">
            <IkonPeringatan className="w-5 h-5 mt-0.5 shrink-0" />
            <span>
              Lengkapi toko: <span className="font-semibold">{kurang.join(", ")}</span>. Tanpa ini pembeli tidak bisa transfer
              atau menghubungi dapur.
            </span>
          </p>
          <Link href="/admin/pengaturan" className="tombol-kedua tombol-kecil">
            Lengkapi sekarang
          </Link>
        </div>
      )}

      {/* Yang perlu dilakukan */}
      <section aria-labelledby="judul-tugas">
        <h2 id="judul-tugas" className="judul-bagian">
          Yang perlu dikerjakan
        </h2>
        <ul className={`mt-3 grid grid-cols-2 gap-3 ${tugas.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {tugas.map((t, i) => (
            <li key={t.label} className="anim-masuk" style={{ ["--tunda" as string]: `${i * 50}ms` }}>
              <Link
                href={t.href}
                className={`group flex flex-col h-full rounded-2xl border bg-white p-4 kartu-interaktif ${
                  t.nilai > 0 && t.nada === "bata" ? "border-bata/40 ring-2 ring-bata/10" : "border-krem-gelap"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${NADA[t.nada]}`}>
                    <t.Ikon className="w-5 h-5" />
                  </span>
                  <IkonPanahKanan className="w-4 h-4 text-kayu-sedang transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className={`mt-3 text-3xl font-bold angka-tabel ${t.nilai > 0 ? "text-kayu" : "text-kayu-sedang/60"}`}>{t.nilai}</span>
                <span className="text-[15px] font-semibold text-kayu leading-tight">{t.label}</span>
                <span className="text-[13px] text-kayu-sedang">{t.ket}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] items-start">
        {/* Jadwal */}
        <section aria-labelledby="judul-jadwal" className="kartu kartu-isi">
          <div className="flex items-center justify-between gap-3">
            <h2 id="judul-jadwal" className="judul-bagian">
              Jadwal hari ini &amp; besok
            </h2>
            <Link href={`/admin/produksi?tanggal=${besok}`} className="text-[14px] font-semibold text-bata hover:text-bata-tua whitespace-nowrap">
              Rekap masak besok →
            </Link>
          </div>
          {jadwal.length === 0 ? (
            <p className="mt-4 rounded-xl bg-krem-tua px-4 py-6 text-center teks-redup">Tidak ada pesanan aktif untuk hari ini dan besok.</p>
          ) : (
            <ol className="mt-4 divide-y divide-krem-gelap">
              {jadwal.map((p) => {
                const hari = kunciHari(p.tanggalAcara) === hariIni ? "Hari ini" : "Besok";
                const lainnya = p._count.item - p.item.length;
                return (
                  <li key={p.kode}>
                    <Link href={`/pesanan/${p.kode}`} className="flex gap-3 py-3 -mx-2 px-2 rounded-xl hover:bg-krem transition-colors">
                      <span className="w-16 shrink-0 text-center">
                        <span className="block text-lg font-bold text-kayu angka-tabel leading-tight">{jamTampil(p.jamAcara)}</span>
                        <span className={`block text-[12px] font-semibold ${hari === "Hari ini" ? "text-bata-tua" : "text-kayu-sedang"}`}>{hari}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-kayu truncate">{p.namaPemesan}</span>
                          <LencanaStatus status={p.status} />
                        </span>
                        <span className="block text-[14px] text-kayu-sedang truncate">
                          {p.item.map((i) => `${i.namaMenu} ×${i.jumlah}`).join(", ")}
                          {lainnya > 0 ? ` +${lainnya}` : ""}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-kayu-sedang">
                          {p.caraAmbil === "DIANTAR" ? (
                            <span className="inline-flex items-center gap-1"><IkonTruk className="w-3.5 h-3.5" /> Diantar</span>
                          ) : (
                            <span className="inline-flex items-center gap-1"><IkonToko className="w-3.5 h-3.5" /> Ambil</span>
                          )}
                          {pemilik && <LencanaBayar statusBayar={p.statusBayar} />}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <Link href="/admin/papan?rentang=7-hari" className="mt-3 tombol-kedua tombol-kecil w-full">
            Lihat semua di papan pesanan
          </Link>
        </section>

        <div className="space-y-6">
          {pemilik && (
            <section aria-labelledby="judul-penjualan" className="kartu kartu-isi">
              <h2 id="judul-penjualan" className="judul-bagian">
                Penjualan 7 hari
              </h2>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[13px] text-kayu-sedang">Hari ini</p>
                  <p className="text-2xl font-bold text-kayu angka-tabel">{rupiah(ini.omzet)}</p>
                  <p className="text-[13px] text-kayu-sedang">
                    {ini.jumlah} pesanan
                    {persenOmzet !== null && kemarin.omzet > 0 && (
                      <span className={`ml-1.5 font-semibold ${persenOmzet >= 0 ? "text-daun-tua" : "text-bahaya"}`}>
                        {persenOmzet >= 0 ? "▲" : "▼"} {Math.abs(persenOmzet)}% dari kemarin
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-kayu-sedang">7 hari</p>
                  <p className="font-bold text-kayu angka-tabel">{rupiah(total7)}</p>
                  {rata30?._avg.total != null && (
                    <p className="text-[13px] text-kayu-sedang">rata-rata {rupiah(rata30._avg.total)}/pesanan</p>
                  )}
                </div>
              </div>

              {/* Batang tipis berujung bulat, satu warna (besaran), hari ini paling tegas. */}
              <div className="mt-5 grid grid-cols-7 gap-2 h-32 items-end" aria-hidden="true">
                {seri.map((s, i) => {
                  const tinggi = Math.max(3, Math.round((s.omzet / puncak) * 100));
                  const d = dariInputTanggal(s.kunci);
                  return (
                    <div key={s.kunci} className="group relative flex flex-col items-center justify-end h-full">
                      <span className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-kayu px-2 py-1 text-[12px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {rupiah(s.omzet)} · {s.jumlah} psn
                      </span>
                      <span
                        className={`w-full max-w-7 rounded-t-[4px] anim-tumbuh ${i === 6 ? "bg-bata" : "bg-bata/35 group-hover:bg-bata/60"}`}
                        style={{ height: `${tinggi}%`, ["--tunda" as string]: `${i * 40}ms` }}
                      />
                      <span className={`mt-1.5 text-[12px] ${i === 6 ? "font-bold text-kayu" : "text-kayu-sedang"}`}>
                        {i === 6 ? "Ini" : NAMA_HARI_PENDEK[d.getUTCDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <table className="sr-only">
                <caption>Penjualan per hari, 7 hari terakhir</caption>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Pesanan</th>
                    <th>Penjualan</th>
                  </tr>
                </thead>
                <tbody>
                  {seri.map((s) => (
                    <tr key={s.kunci}>
                      <td>{s.kunci}</td>
                      <td>{s.jumlah}</td>
                      <td>{rupiah(s.omzet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Link href="/admin/laporan" className="mt-4 inline-flex text-[14px] font-semibold text-bata hover:text-bata-tua">
                Laporan lengkap →
              </Link>
            </section>
          )}

          <section aria-labelledby="judul-terlaris" className="kartu kartu-isi">
            <h2 id="judul-terlaris" className="judul-bagian flex items-center gap-2">
              <IkonApi className="w-5 h-5 text-bata" />
              Terlaris 30 hari
            </h2>
            {terlaris.length === 0 ? (
              <p className="mt-3 teks-redup">Belum ada data penjualan.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {terlaris.map((t, i) => {
                  const n = t._sum.jumlah ?? 0;
                  return (
                    <li key={t.namaMenu}>
                      <div className="flex items-baseline justify-between gap-3 text-[15px]">
                        <span className="min-w-0 truncate text-kayu">
                          <span className="font-bold text-kayu-sedang mr-1.5">{i + 1}.</span>
                          {t.namaMenu}
                        </span>
                        <span className="shrink-0 font-semibold text-kayu angka-tabel">{n.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-krem-tua overflow-hidden">
                        <div className="h-full rounded-full bg-kunyit" style={{ width: `${Math.max(4, (n / puncakTerlaris) * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* Aksi cepat */}
      <section aria-labelledby="judul-aksi">
        <h2 id="judul-aksi" className="judul-bagian">
          Aksi cepat
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pemilik && (
            <>
              <Link href="/admin/menu/baru" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
                <IkonTambah className="w-5 h-5 text-bata" />
                Tambah menu
              </Link>
              <Link href="/admin/keuangan" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
                <IkonDompet className="w-5 h-5 text-bata" />
                Catat pengeluaran
              </Link>
              <Link href="/admin/voucher" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
                <IkonTiket className="w-5 h-5 text-bata" />
                Buat voucher
              </Link>
            </>
          )}
          <Link href={`/admin/produksi?tanggal=${besok}`} className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
            <IkonWajan className="w-5 h-5 text-bata" />
            Rekap masak besok
          </Link>
          {pemilik ? (
            <TombolBagikanToko
              url={alamatSitus()}
              namaUsaha={pengaturan.namaUsaha}
              className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center [&>svg]:text-bata"
            />
          ) : (
            <Link href="/admin/papan" className="tombol-kedua h-full py-3 flex-col !gap-1.5 whitespace-normal text-center">
              <IkonMangkuk className="w-5 h-5 text-bata" />
              Papan pesanan
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
