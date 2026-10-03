import Link from "next/link";
import { angka, dariInputTanggal, tanggalTanpaTahun } from "@/lib/format";
import { ambilPerkiraan } from "@/lib/insight-server";
import { MIN_HARI_RIWAYAT, MIN_PESANAN_RIWAYAT } from "@/lib/perkiraan";

const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/*
  Warna: ramp ordinal satu hue (bata), divalidasi dengan validator dataviz —
  gelap = sudah pasti, terang + arsir 45° = perkiraan. Arsir membuat bedanya
  terbaca tanpa mengandalkan warna (buta warna, cetak hitam-putih).
*/
const WARNA_PASTI = "#C2461C";
const WARNA_PERKIRAAN = "#E08A63";
const ARSIR = `repeating-linear-gradient(45deg, ${WARNA_PERKIRAAN} 0 4px, #F3C2AB 4px 7px)`;

function labelHari(tanggal: string, jarak: number) {
  if (jarak === 1) return "Besok";
  if (jarak === 2) return "Lusa";
  const d = dariInputTanggal(tanggal); // tengah hari WIB → hari UTC sama dengan hari WIB
  return `${NAMA_HARI[d.getUTCDay()]}, ${tanggalTanpaTahun(d).replace(/(\d+ \w{3})\w*/, "$1")}`;
}

export async function TabPerkiraan() {
  const p = await ambilPerkiraan();
  const maks = Math.max(1, ...p.hari.map((h) => Math.max(h.perkiraan ?? 0, h.sudahDipesan)));
  const totalPasti = p.hari.reduce((n, h) => n + h.sudahDipesan, 0);
  const totalPerkiraan = p.hari.reduce((n, h) => n + (h.perkiraan ?? h.sudahDipesan), 0);
  const tersibuk = p.cukupData ? [...p.hari].sort((a, b) => (b.perkiraan ?? 0) - (a.perkiraan ?? 0))[0] : null;

  return (
    <>
      {!p.cukupData && (
        <p className="kotak-peringatan mb-6">
          <span className="font-semibold">Data belum cukup untuk menebak.</span> Perkiraan butuh minimal {MIN_HARI_RIWAYAT} hari riwayat
          dan {MIN_PESANAN_RIWAYAT} pesanan (sekarang {p.hariRiwayat} hari). Sementara ini yang tampil hanya porsi yang sudah dipesan.
        </p>
      )}

      <dl className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <div className="kartu p-5">
          <dt className="teks-redup">Sudah dipesan, 7 hari</dt>
          <dd className="mt-1 text-xl sm:text-2xl font-semibold angka-tabel">{angka(totalPasti)} porsi</dd>
        </div>
        <div className="kartu p-5">
          <dt className="teks-redup">Perkiraan total, 7 hari</dt>
          <dd className="mt-1 text-xl sm:text-2xl font-semibold angka-tabel">{p.cukupData ? `± ${angka(totalPerkiraan)} porsi` : "—"}</dd>
        </div>
        {tersibuk && (
          <div className="kartu p-5 col-span-2 lg:col-span-1">
            <dt className="teks-redup">Hari tersibuk</dt>
            <dd className="mt-1 text-xl sm:text-2xl font-semibold">{labelHari(tersibuk.tanggal, tersibuk.jarak)}</dd>
            <dd className="text-xs text-kayu-sedang">
              ± {angka(tersibuk.perkiraan ?? 0)} porsi ·{" "}
              <Link href={`/admin/produksi?tanggal=${tersibuk.tanggal}`} className="text-bata font-medium hover:underline">
                lihat rekap produksi
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="judul-grafik-perkiraan" className="kartu kartu-isi mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="judul-grafik-perkiraan" className="judul-bagian">Porsi 7 hari ke depan</h2>
          <ul className="flex flex-wrap gap-4 text-xs text-kayu-sedang" aria-label="Keterangan">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-3 rounded-sm" style={{ background: WARNA_PASTI }} /> Sudah dipesan
            </li>
            {p.cukupData && (
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-3 rounded-sm" style={{ background: ARSIR }} /> Perkiraan tambahan
              </li>
            )}
          </ul>
        </div>

        {/* Grafik sekaligus tabel: tiap baris punya label & angka yang terbaca tanpa warna. */}
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Porsi yang sudah dipesan dan perkiraan total per hari</caption>
          <thead>
            <tr className="text-xs text-kayu-sedang">
              <th scope="col" className="pb-1 text-left font-medium">Hari</th>
              <th scope="col" className="pb-1"><span className="sr-only">Grafik</span></th>
              <th scope="col" className="pb-1 pl-3 text-right font-medium">Dipesan</th>
              <th scope="col" className="pb-1 pl-2 text-right font-medium">Perkiraan</th>
            </tr>
          </thead>
          <tbody>
            {p.hari.map((h) => {
              const total = h.perkiraan ?? h.sudahDipesan;
              const tambahan = Math.max(0, total - h.sudahDipesan);
              const ket =
                `${labelHari(h.tanggal, h.jarak)}: ${angka(h.sudahDipesan)} porsi sudah dipesan` +
                (h.perkiraan !== null ? `, perkiraan total ± ${angka(h.perkiraan)}` : "") +
                (h.biasanyaSudahMasuk !== null ? ` · biasanya ${Math.round(h.biasanyaSudahMasuk * 100)}% pesanan sudah masuk pada H-${h.jarak}` : "");
              return (
                <tr key={h.tanggal} className="group" title={ket}>
                  <th scope="row" className="w-24 sm:w-32 py-2 pr-3 text-left font-medium text-kayu whitespace-nowrap align-middle">
                    <Link href={`/admin/produksi?tanggal=${h.tanggal}`} className="hover:text-bata hover:underline">
                      {labelHari(h.tanggal, h.jarak)}
                    </Link>
                  </th>
                  <td className="py-2 align-middle">
                    <div className="flex h-7 items-center gap-[2px] rounded group-hover:bg-krem-tua">
                      {h.sudahDipesan > 0 && (
                        <div className="h-full rounded-l rounded-r-[4px]" style={{ width: `${(h.sudahDipesan / maks) * 100}%`, background: WARNA_PASTI }} />
                      )}
                      {tambahan > 0 && (
                        <div className="h-full rounded-r-[4px]" style={{ width: `${(tambahan / maks) * 100}%`, background: ARSIR }} />
                      )}
                    </div>
                  </td>
                  <td className="w-16 sm:w-20 py-2 pl-3 text-right angka-tabel font-semibold text-kayu">{angka(h.sudahDipesan)}</td>
                  <td className="w-20 sm:w-24 py-2 pl-2 text-right angka-tabel text-kayu-sedang">
                    {h.perkiraan !== null ? `± ${angka(h.perkiraan)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <details className="kartu kartu-isi mt-6 group">
        <summary className="cursor-pointer font-medium text-kayu">Bagaimana perkiraan ini dihitung?</summary>
        <div className="mt-3 space-y-2 text-sm text-kayu-sedang">
          <p>
            Bukan tebakan AI — ada dua petunjuk dari riwayat 8 minggu terakhir:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <span className="font-medium text-kayu">Kurva pemesanan:</span> berapa persen porsi yang biasanya sudah masuk sekian hari sebelum
              acara. Bila H-3 biasanya baru 50% dan sekarang sudah 100 porsi, petunjuknya ± 200.
            </li>
            <li>
              <span className="font-medium text-kayu">Kebiasaan hari yang sama:</span> rata-rata hari Senin, Selasa, dst. dalam 8 minggu
              terakhir — minggu terbaru berbobot paling besar.
            </li>
          </ol>
          <p>
            Makin dekat ke hari H, makin dipercaya pesanan yang sudah ada. Perkiraan tidak pernah lebih kecil dari porsi yang sudah dipesan.
            Pesanan batal tidak dihitung.
          </p>
        </div>
      </details>
    </>
  );
}
