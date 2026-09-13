import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { rentangBulan, ringkasanKas } from "@/lib/laporan";
import {
  hariIniWib,
  kunciHari,
  rupiah,
  tanggalPanjang,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Laporan" };

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function labelBulan(kunci: string): string {
  const [tahun, bulan] = kunci.split("-").map(Number);
  return `${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

function geserBulan(kunci: string, langkah: number): string {
  const [tahun, bulan] = kunci.split("-").map(Number);
  const d = new Date(Date.UTC(tahun, bulan - 1 + langkah, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { bulan } = await searchParams;
  const bulanIni = hariIniWib().slice(0, 7);
  const kunciBulan = /^\d{4}-\d{2}$/.test(bulan ?? "") ? bulan! : bulanIni;

  const rentang = rentangBulan(kunciBulan);

  const [kas, pesananSelesai, catatanKas, pengeluaranPerKategori] =
    await Promise.all([
      ringkasanKas(rentang),
      db.pesanan.findMany({
        where: { tanggalAcara: rentang, status: "SELESAI" },
        include: { item: true },
      }),
      db.catatanKas.findMany({
        where: { tanggal: rentang },
        select: { jenis: true, jumlah: true, tanggal: true },
      }),
      db.catatanKas.groupBy({
        by: ["kategori"],
        where: { tanggal: rentang, jenis: "KELUAR" },
        _sum: { jumlah: true },
        orderBy: { _sum: { jumlah: "desc" } },
      }),
    ]);

  // Menu terlaris dihitung dari pesanan yang benar-benar selesai, bukan dari
  // semua pesanan, supaya pesanan batal tidak ikut menaikkan angka penjualan.
  const perMenu = new Map<string, { jumlah: number; nilai: number; satuan: string }>();
  for (const p of pesananSelesai) {
    for (const i of p.item) {
      const ada = perMenu.get(i.namaMenu);
      perMenu.set(i.namaMenu, {
        jumlah: (ada?.jumlah ?? 0) + i.jumlah,
        nilai: (ada?.nilai ?? 0) + i.subtotal,
        satuan: i.satuan,
      });
    }
  }
  const terlaris = [...perMenu.entries()]
    .sort((a, b) => b[1].nilai - a[1].nilai)
    .slice(0, 8);

  // Ringkasan harian untuk grafik batang.
  const perHari = new Map<string, { masuk: number; keluar: number }>();
  for (const c of catatanKas) {
    const kunci = kunciHari(c.tanggal);
    const ada = perHari.get(kunci) ?? { masuk: 0, keluar: 0 };
    if (c.jenis === "MASUK") ada.masuk += c.jumlah;
    else ada.keluar += c.jumlah;
    perHari.set(kunci, ada);
  }
  const harian = [...perHari.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const tertinggi = Math.max(
    1,
    ...harian.map((h) => Math.max(h[1].masuk, h[1].keluar))
  );

  const totalPesanan = pesananSelesai.length;
  const rataPesanan = totalPesanan
    ? Math.round(pesananSelesai.reduce((t, p) => t + p.total, 0) / totalPesanan)
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-kolom">Laporan</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">{labelBulan(kunciBulan)}</h1>
          <p className="mt-2 text-arang-muda">
            Ringkasan uang dan penjualan sepanjang bulan ini.
          </p>
        </div>

        <nav aria-label="Pilih bulan" className="tanpa-cetak flex gap-2">
          <Link
            href={`/admin/laporan?bulan=${geserBulan(kunciBulan, -1)}`}
            className="tombol tombol-kedua"
          >
            &larr; Bulan Sebelumnya
          </Link>
          {kunciBulan !== bulanIni ? (
            <Link href="/admin/laporan" className="tombol tombol-kedua">
              Bulan Ini
            </Link>
          ) : null}
          <Link
            href={`/admin/laporan?bulan=${geserBulan(kunciBulan, 1)}`}
            className="tombol tombol-kedua"
          >
            Bulan Berikutnya &rarr;
          </Link>
        </nav>
      </header>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kartu p-5">
          <p className="label-kolom">Uang masuk</p>
          <p className="mt-1 font-judul text-3xl text-daun-tua">
            {rupiah(kas.masuk)}
          </p>
        </div>
        <div className="kartu p-5">
          <p className="label-kolom">Uang keluar</p>
          <p className="mt-1 font-judul text-3xl text-kayu-tua">
            {rupiah(kas.keluar)}
          </p>
        </div>
        <div
          className={`kartu p-5 ${kas.selisih < 0 ? "border-bahaya/40 bg-bahaya-lembut" : "border-daun/40 bg-daun-lembut"}`}
        >
          <p className="label-kolom">Sisa bersih</p>
          <p
            className={`mt-1 font-judul text-3xl ${kas.selisih < 0 ? "text-bahaya" : "text-daun-tua"}`}
          >
            {rupiah(kas.selisih)}
          </p>
        </div>
        <div className="kartu p-5">
          <p className="label-kolom">Pesanan selesai</p>
          <p className="mt-1 font-judul text-3xl">{totalPesanan}</p>
          <p className="mt-1 text-[0.88rem] text-arang-muda">
            Rata-rata {rupiah(rataPesanan)} per pesanan
          </p>
        </div>
      </div>

      {kas.masuk === 0 && kas.keluar === 0 ? (
        <p className="kartu mt-8 p-10 text-center text-arang-muda">
          Belum ada catatan keuangan di bulan ini.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* ---- Grafik harian ---- */}
          <section className="kartu p-5 lg:col-span-7" aria-labelledby="judul-harian">
            <h2 id="judul-harian" className="font-judul text-xl">
              Uang masuk &amp; keluar per hari
            </h2>
            <p className="mt-1 flex flex-wrap gap-4 text-[0.88rem] text-arang-muda">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-4 rounded-sm bg-daun"
                />
                Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-4 rounded-sm bg-kayu"
                />
                Keluar
              </span>
            </p>

            <ul className="mt-4 space-y-2">
              {harian.map(([kunci, nilai]) => (
                <li key={kunci} className="grid grid-cols-[3rem_1fr] items-center gap-3">
                  <span className="text-[0.85rem] text-arang-muda">
                    {kunci.slice(8)}
                  </span>
                  <span className="space-y-1">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="block h-3 rounded-sm bg-daun"
                        style={{
                          width: `${Math.max(2, (nilai.masuk / tertinggi) * 100)}%`,
                        }}
                      />
                      <span className="shrink-0 text-[0.8rem] text-arang-muda">
                        {nilai.masuk > 0 ? rupiah(nilai.masuk) : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="block h-3 rounded-sm bg-kayu"
                        style={{
                          width: `${Math.max(2, (nilai.keluar / tertinggi) * 100)}%`,
                        }}
                      />
                      <span className="shrink-0 text-[0.8rem] text-arang-muda">
                        {nilai.keluar > 0 ? rupiah(nilai.keluar) : ""}
                      </span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-6 lg:col-span-5">
            {/* ---- Menu terlaris ---- */}
            <section className="kartu p-5" aria-labelledby="judul-terlaris">
              <h2 id="judul-terlaris" className="font-judul text-xl">
                Menu paling laku
              </h2>
              {terlaris.length === 0 ? (
                <p className="mt-3 text-arang-muda">
                  Belum ada pesanan yang selesai bulan ini.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {terlaris.map(([nama, isi], i) => (
                    <li key={nama} className="flex items-baseline gap-3">
                      <span className="font-judul text-lg text-arang-muda">
                        {i + 1}
                      </span>
                      <span className="flex-1">
                        <span className="block font-medium">{nama}</span>
                        <span className="block text-[0.85rem] text-arang-muda">
                          {isi.jumlah} {isi.satuan} terjual
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold">
                        {rupiah(isi.nilai)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* ---- Pengeluaran ---- */}
            <section className="kartu p-5" aria-labelledby="judul-keluar">
              <h2 id="judul-keluar" className="font-judul text-xl">
                Pengeluaran terbesar
              </h2>
              {pengeluaranPerKategori.length === 0 ? (
                <p className="mt-3 text-arang-muda">
                  Belum ada pengeluaran tercatat bulan ini.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {pengeluaranPerKategori.map((k) => (
                    <li
                      key={k.kategori}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span>{k.kategori}</span>
                      <span className="shrink-0 font-semibold text-kayu-tua">
                        {rupiah(k._sum.jumlah ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      <p className="mt-8 text-[0.88rem] text-arang-muda">
        Laporan dibuat pada {tanggalPanjang(new Date())}.
      </p>
    </div>
  );
}
