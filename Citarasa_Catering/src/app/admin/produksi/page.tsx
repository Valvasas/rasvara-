import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { bacaSesi } from "@/lib/auth";
import { rentangHari } from "@/lib/laporan";
import { dariInputTanggal, hariIniWib, jamTampil, kunciHari, labelHari, tanggalPanjang, teleponTampil } from "@/lib/format";
import { LencanaStatus } from "@/components/Lencana";
import { TombolCetakHalaman } from "@/components/admin/TombolCetakHalaman";
import { IkonLokasi, IkonToko, IkonTruk, IkonWajan } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Rekap masak" };

/** Batas lembar jalan per halaman. Dapur katering rumahan jarang di atas ini per hari. */
const BATAS_PESANAN = 300;
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function geser(kunci: string, hari: number): string {
  return kunciHari(new Date(dariInputTanggal(kunci).getTime() + hari * 86_400_000));
}

interface HalamanProduksiProps {
  searchParams: Promise<{ tanggal?: string }>;
}

/**
 * Rekap masak — jawaban untuk pertanyaan yang setiap malam ditanyakan dapur:
 * "besok total masak apa saja, berapa banyak, dan jam berapa harus siap?"
 *
 * Bagian atas menjumlahkan porsi per menu dari SEMUA pesanan pada tanggal itu
 * (pesanan batal tidak dihitung) — langsung jadi daftar belanja & target
 * masak. Bagian bawah adalah lembar jalan per jam siap untuk pengemasan dan
 * pengantaran. Halaman ini bisa dicetak.
 */
export default async function HalamanProduksi({ searchParams }: HalamanProduksiProps) {
  const [params, sesi] = await Promise.all([searchParams, bacaSesi()]);
  const hariIni = hariIniWib();
  const tanggal = POLA_TANGGAL.test(params.tanggal ?? "") ? (params.tanggal as string) : hariIni;
  const rentang = rentangHari(tanggal);
  const syarat = { tanggalAcara: rentang, status: { not: "DIBATALKAN" as const } };

  const [perMenu, daftar, jumlahPesanan] = await Promise.all([
    // Dijumlahkan di database per nama menu (snapshot di nota, invarian #2),
    // jadi menu yang sudah diganti namanya tetap terhitung sesuai pesanan.
    db.itemPesanan.groupBy({
      by: ["namaMenu", "satuan"],
      where: { pesanan: syarat },
      _sum: { jumlah: true },
      _count: { _all: true },
      orderBy: { _sum: { jumlah: "desc" } },
    }),
    db.pesanan.findMany({
      where: syarat,
      select: {
        kode: true,
        namaPemesan: true,
        teleponPemesan: true,
        jamAcara: true,
        status: true,
        caraAmbil: true,
        alamatAntar: true,
        latitude: true,
        longitude: true,
        catatan: true,
        item: { select: { id: true, namaMenu: true, jumlah: true, satuan: true, catatan: true } },
      },
      orderBy: [{ jamAcara: "asc" }, { dibuatPada: "asc" }],
      take: BATAS_PESANAN,
    }),
    db.pesanan.count({ where: syarat }),
  ]);

  const totalPorsi = perMenu.reduce((n, m) => n + (m._sum.jumlah ?? 0), 0);
  const diantar = daftar.filter((p) => p.caraAmbil === "DIANTAR").length;
  const perJam = new Map<string, typeof daftar>();
  for (const p of daftar) {
    const kelompok = perJam.get(p.jamAcara) ?? [];
    kelompok.push(p);
    perJam.set(p.jamAcara, kelompok);
  }
  const pilihanCepat = [0, 1, 2].map((h) => {
    const k = geser(hariIni, h);
    return { kunci: k, label: h === 0 ? "Hari ini" : h === 1 ? "Besok" : "Lusa" };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman flex items-center gap-3">
            <IkonWajan className="w-8 h-8 text-bata jangan-cetak" />
            Rekap masak
          </h1>
          <p className="teks-redup mt-1">
            {labelHari(dariInputTanggal(tanggal))} · <span className="font-semibold text-kayu">{tanggalPanjang(dariInputTanggal(tanggal))}</span>
          </p>
        </div>
        <TombolCetakHalaman />
      </header>

      <div className="jangan-cetak flex flex-wrap items-center gap-2">
        {pilihanCepat.map((p) => (
          <Link
            key={p.kunci}
            href={`/admin/produksi?tanggal=${p.kunci}`}
            aria-current={tanggal === p.kunci ? "page" : undefined}
            className={`pil ${tanggal === p.kunci ? "pil-aktif" : ""}`}
          >
            {p.label}
          </Link>
        ))}
        <form method="get" action="/admin/produksi" className="flex items-center gap-2">
          <label htmlFor="tanggal-rekap" className="sr-only">
            Pilih tanggal lain
          </label>
          <input id="tanggal-rekap" type="date" name="tanggal" defaultValue={tanggal} className="isian !w-auto" />
          <button type="submit" className="tombol-kedua tombol-kecil">
            Tampilkan
          </button>
        </form>
      </div>

      <ul className="grid grid-cols-3 gap-3">
        {[
          { label: "Pesanan", nilai: jumlahPesanan },
          { label: "Total porsi", nilai: totalPorsi },
          { label: "Diantar", nilai: diantar },
        ].map((k) => (
          <li key={k.label} className="kartu p-4">
            <p className="text-[13px] text-kayu-sedang">{k.label}</p>
            <p className="mt-0.5 text-2xl sm:text-3xl font-bold text-kayu angka-tabel">{k.nilai.toLocaleString("id-ID")}</p>
          </li>
        ))}
      </ul>

      {jumlahPesanan === 0 ? (
        <p className="kartu kartu-isi text-center teks-redup">Tidak ada pesanan untuk tanggal ini.</p>
      ) : (
        <>
          <section aria-labelledby="judul-total" className="kartu overflow-hidden">
            <h2 id="judul-total" className="judul-bagian px-5 sm:px-6 pt-5">
              Yang harus dimasak
            </h2>
            <p className="teks-redup px-5 sm:px-6 mt-1">Jumlah dari semua pesanan aktif pada tanggal ini.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th className="!text-right">Jumlah</th>
                    <th className="!text-right">Dari pesanan</th>
                  </tr>
                </thead>
                <tbody>
                  {perMenu.map((m) => (
                    <tr key={`${m.namaMenu}|${m.satuan}`}>
                      <td className="font-semibold text-kayu">{m.namaMenu}</td>
                      <td className="text-right whitespace-nowrap">
                        <span className="text-xl font-bold text-bata-tua angka-tabel">{(m._sum.jumlah ?? 0).toLocaleString("id-ID")}</span>{" "}
                        <span className="text-kayu-sedang">{m.satuan}</span>
                      </td>
                      <td className="text-right text-kayu-sedang angka-tabel">{m._count._all}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="judul-lembar" className="space-y-4">
            <h2 id="judul-lembar" className="judul-bagian">
              Lembar jalan per jam siap
            </h2>
            {jumlahPesanan > daftar.length && (
              <p className="kotak-peringatan">
                Menampilkan {daftar.length} dari {jumlahPesanan} pesanan. Total porsi di atas tetap menghitung semuanya.
              </p>
            )}
            {[...perJam.entries()].map(([jamSiap, kelompok]) => (
              <div key={jamSiap} className="kartu overflow-hidden break-inside-avoid">
                <div className="flex items-center justify-between gap-3 px-5 py-3 bg-kunyit-lembut/60 border-b border-krem-gelap">
                  <p className="text-lg font-bold text-kayu angka-tabel">Siap {jamTampil(jamSiap)} WIB</p>
                  <p className="text-[14px] text-kunyit-tua font-semibold">{kelompok.length} pesanan</p>
                </div>
                <ul className="divide-y divide-krem-gelap">
                  {kelompok.map((p) => (
                    <li key={p.kode} className="px-5 py-4 grid gap-3 sm:grid-cols-[1fr_1.2fr]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/pesanan/${p.kode}`} className="font-bold text-kayu hover:text-bata">
                            {p.namaPemesan}
                          </Link>
                          <LencanaStatus status={p.status} />
                        </div>
                        <p className="text-[13px] text-kayu-sedang font-mono">{p.kode}</p>
                        <p className="mt-1.5 flex items-start gap-1.5 text-[14px] text-kayu">
                          {p.caraAmbil === "DIANTAR" ? (
                            <>
                              <IkonTruk className="w-4 h-4 mt-0.5 shrink-0 text-bata-tua" />
                              <span>
                                {p.alamatAntar}
                                {p.latitude != null && p.longitude != null && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="jangan-cetak ml-1.5 inline-flex items-center gap-0.5 text-bata font-semibold hover:underline"
                                  >
                                    <IkonLokasi className="w-3.5 h-3.5" /> Peta
                                  </a>
                                )}
                              </span>
                            </>
                          ) : (
                            <>
                              <IkonToko className="w-4 h-4 mt-0.5 shrink-0 text-kayu-sedang" />
                              Ambil sendiri
                            </>
                          )}
                        </p>
                        <p className="text-[13px] text-kayu-sedang angka-tabel">{teleponTampil(p.teleponPemesan)}</p>
                      </div>
                      <div>
                        <ul className="space-y-1 text-[15px]">
                          {p.item.map((it) => (
                            <li key={it.id} className="flex justify-between gap-3">
                              <span className="text-kayu">
                                {it.namaMenu}
                                {it.catatan && <span className="block text-[13px] text-kunyit-tua">↳ {it.catatan}</span>}
                              </span>
                              <span className="font-bold text-kayu angka-tabel whitespace-nowrap">
                                {it.jumlah} {it.satuan}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {p.catatan && (
                          <p className="mt-2 rounded-lg bg-kunyit-lembut px-3 py-2 text-[14px] text-kunyit-tua">
                            <span className="font-semibold">Catatan:</span> {p.catatan}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      {sesi?.peran === "STAF_DAPUR" && (
        <p className="teks-redup jangan-cetak">Rekap ini tidak memuat nominal uang.</p>
      )}
    </div>
  );
}
