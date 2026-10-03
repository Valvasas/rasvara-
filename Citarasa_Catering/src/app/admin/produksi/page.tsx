import type { Metadata } from "next";
import Link from "next/link";
import { bacaSesi } from "@/lib/auth";
import { dariInputTanggal, hariIniWib, jamTampil, kunciHari, rupiah, tanggalPanjang } from "@/lib/format";
import { INFO_STATUS } from "@/lib/pesanan";
import { angkaTakaran } from "@/lib/belanja";
import { ambilProduksi, BATAS_JADWAL } from "@/lib/produksi";
import { TombolCetakHalaman } from "@/components/admin/TombolCetakHalaman";
import { IkonToko, IkonTruk, IkonUnduh } from "@/components/ikon/Ikon";

export const metadata: Metadata = { title: "Produksi & belanja" };

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function geser(kunci: string, hari: number) {
  return kunciHari(new Date(dariInputTanggal(kunci).getTime() + hari * 86_400_000));
}

interface HalamanProduksiProps {
  searchParams: Promise<{ tanggal?: string; baru?: string }>;
}

export default async function HalamanProduksi({ searchParams }: HalamanProduksiProps) {
  const [params, sesi] = await Promise.all([searchParams, bacaSesi()]);
  const adalahPemilik = sesi?.peran === "PEMILIK";
  const hariIni = hariIniWib();
  const besok = geser(hariIni, 1);
  // Bawaan: besok — saat pemilik paling butuh tahu apa yang harus dibeli.
  const tanggal = POLA_TANGGAL.test(params.tanggal ?? "") ? params.tanggal! : besok;
  const sertakanBaru = params.baru === "1";

  const data = await ambilProduksi(tanggal, sertakanBaru);
  const href = (t: string, b = sertakanBaru) => `/admin/produksi?tanggal=${t}${b ? "&baru=1" : ""}`;
  const pilihanCepat = [
    { label: "Hari ini", t: hariIni },
    { label: "Besok", t: besok },
    { label: "Lusa", t: geser(hariIni, 2) },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="judul-halaman">Produksi &amp; belanja</h1>
          <p className="teks-redup mt-1">{tanggalPanjang(dariInputTanggal(tanggal))}</p>
        </div>
        <div className="flex flex-wrap gap-2 jangan-cetak">
          <TombolCetakHalaman />
          <a href={`/api/admin/produksi-xlsx?tanggal=${tanggal}${sertakanBaru ? "&baru=1" : ""}`} className="tombol-kedua">
            <IkonUnduh className="w-4 h-4" /> XLSX
          </a>
        </div>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2 jangan-cetak">
        {pilihanCepat.map((p) => (
          <Link key={p.t} href={href(p.t)} aria-current={tanggal === p.t ? "page" : undefined} className={`pil ${tanggal === p.t ? "pil-aktif" : ""}`}>
            {p.label}
          </Link>
        ))}
        <form method="get" className="flex gap-2">
          <label htmlFor="tanggal-produksi" className="sr-only">Pilih tanggal</label>
          <input id="tanggal-produksi" type="date" name="tanggal" defaultValue={tanggal} className="isian min-h-[40px] w-auto" />
          {sertakanBaru && <input type="hidden" name="baru" value="1" />}
          <button type="submit" className="tombol-kedua tombol-kecil min-h-[40px]">Lihat</button>
        </form>
      </div>
      {/* Saklar berupa tautan (state ada di URL → bisa dibagikan & dicetak ulang). */}
      <Link
        href={href(tanggal, !sertakanBaru)}
        role="switch"
        aria-checked={sertakanBaru}
        className="mt-3 inline-flex items-center gap-2.5 rounded-lg py-1.5 text-sm text-kayu jangan-cetak focus-visible:outline-2 focus-visible:outline-bata"
      >
        <span aria-hidden className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${sertakanBaru ? "bg-daun" : "bg-krem-gelap"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${sertakanBaru ? "left-[18px]" : "left-0.5"}`} />
        </span>
        Hitung juga pesanan yang belum diterima
      </Link>

      {data.jumlahBaruTertunda > 0 && (
        <p className="kotak-peringatan mt-4 jangan-cetak">
          {data.jumlahBaruTertunda} pesanan baru untuk tanggal ini belum diterima dan belum dihitung.{" "}
          <Link href={href(tanggal, true)} className="font-semibold underline">Ikutkan</Link>
        </p>
      )}

      <dl className="mt-6 grid gap-3 grid-cols-3 max-w-xl">
        <div className="kartu p-4"><dt className="teks-redup">Pesanan</dt><dd className="text-xl font-semibold angka-tabel">{data.jadwal.length}</dd></div>
        <div className="kartu p-4"><dt className="teks-redup">Total porsi</dt><dd className="text-xl font-semibold angka-tabel">{data.totalPorsi.toLocaleString("id-ID")}</dd></div>
        <div className="kartu p-4"><dt className="teks-redup">Diantar</dt><dd className="text-xl font-semibold angka-tabel">{data.jadwal.filter((j) => j.caraAmbil === "DIANTAR").length}</dd></div>
      </dl>

      {data.jadwal.length === 0 ? (
        <p className="kartu kartu-isi mt-6 text-center teks-redup">Tidak ada pesanan untuk tanggal ini.</p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-2 items-start">
          <section aria-labelledby="judul-porsi" className="kartu overflow-hidden">
            <h2 id="judul-porsi" className="judul-bagian px-5 pt-5">Yang dimasak</h2>
            <table className="tabel mt-3">
              <thead>
                <tr><th scope="col">Menu</th><th scope="col" className="text-right">Jumlah</th></tr>
              </thead>
              <tbody>
                {data.porsi.map((p) => (
                  <tr key={p.menuId ?? p.namaMenu}>
                    <td className="text-kayu">{p.namaMenu}</td>
                    <td className="text-right font-semibold angka-tabel whitespace-nowrap">{p.jumlah.toLocaleString("id-ID")} {p.satuan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="judul-belanja" className="kartu overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
              <h2 id="judul-belanja" className="judul-bagian">Daftar belanja</h2>
              {adalahPemilik && data.belanja.totalBiaya > 0 && (
                <p className="text-sm text-kayu-sedang">± <span className="font-semibold text-kayu angka-tabel">{rupiah(data.belanja.totalBiaya)}</span></p>
              )}
            </div>
            {data.belanja.baris.length === 0 ? (
              <p className="px-5 py-6 teks-redup">
                Belum ada resep untuk menu-menu ini.{" "}
                {adalahPemilik && <Link href="/admin/bahan" className="text-bata hover:underline">Isi resep</Link>}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tabel mt-3 min-w-[420px]">
                  <thead>
                    <tr>
                      <th scope="col">Bahan</th>
                      <th scope="col" className="text-right">Beli</th>
                      {adalahPemilik && <th scope="col" className="text-right">Perkiraan</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.belanja.baris.map((b) => (
                      <tr key={b.bahanId}>
                        <td>
                          <p className="text-kayu">{b.namaBahan}</p>
                          <p className="text-xs text-kayu-sedang truncate max-w-[240px]">untuk {b.dipakaiUntuk.join(", ")}</p>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <span className="font-semibold angka-tabel">{angkaTakaran(b.jumlahBeli)} {b.satuan}</span>
                          {b.jumlahBeli !== b.jumlah && <span className="block text-xs text-kayu-sedang angka-tabel">butuh {angkaTakaran(b.jumlah)}</span>}
                        </td>
                        {adalahPemilik && <td className="text-right angka-tabel whitespace-nowrap">{rupiah(b.perkiraanBiaya)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.belanja.tanpaResep.length > 0 && (
              <p className="mx-5 mb-5 mt-3 kotak-peringatan">
                Belum dihitung (tanpa resep): {data.belanja.tanpaResep.join(", ")}.
              </p>
            )}
          </section>

          <section aria-labelledby="judul-jadwal-siap" className="kartu overflow-hidden xl:col-span-2">
            <h2 id="judul-jadwal-siap" className="judul-bagian px-5 pt-5">Jadwal siap</h2>
            <div className="overflow-x-auto">
              <table className="tabel mt-3 min-w-[640px]">
                <thead>
                  <tr>
                    <th scope="col">Jam</th>
                    <th scope="col">Pemesan</th>
                    <th scope="col">Isi</th>
                    <th scope="col">Pengambilan</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jadwal.map((j) => (
                    <tr key={j.kode}>
                      <td className="font-semibold angka-tabel whitespace-nowrap">{jamTampil(j.jamAcara)}</td>
                      <td>
                        <Link href={`/admin/pesanan/${j.kode}`} className="font-medium text-kayu hover:text-bata">{j.namaPemesan}</Link>
                        <span className="block font-mono text-[11px] text-kayu-sedang">{j.kode}</span>
                      </td>
                      <td className="text-sm">
                        {j.item.map((i) => `${i.namaMenu} ×${i.jumlah}`).join(", ")}
                        {j.catatan && <span className="block text-xs text-kunyit-tua">Catatan: {j.catatan}</span>}
                      </td>
                      <td className="text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          {j.caraAmbil === "DIANTAR" ? <IkonTruk className="w-4 h-4" /> : <IkonToko className="w-4 h-4" />}
                          {j.caraAmbil === "DIANTAR" ? "Antar" : "Ambil"}
                        </span>
                        {j.alamatAntar && <span className="block text-xs text-kayu-sedang max-w-[220px]">{j.alamatAntar}</span>}
                      </td>
                      <td className="whitespace-nowrap text-sm">{INFO_STATUS[j.status].label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.jadwal.length >= BATAS_JADWAL && <p className="px-5 pb-4 teks-redup">Menampilkan {BATAS_JADWAL} pesanan pertama.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
