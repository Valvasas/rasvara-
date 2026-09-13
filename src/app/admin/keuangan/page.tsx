import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { FormKas } from "@/components/admin/FormKas";
import { TombolHapusKas } from "@/components/admin/TombolHapusKas";
import { Lencana } from "@/components/Lencana";
import { rentangHari, rentangMundur, ringkasanKas } from "@/lib/laporan";
import { hariIniWib, kunciHari, rupiah, tanggalPanjang } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Buku Kas" };

export default async function HalamanKeuangan() {
  const kunciHariIni = hariIniWib();

  const [kasHariIni, kasMinggu, kasBulan, catatan] = await Promise.all([
    ringkasanKas(rentangHari(kunciHariIni)),
    ringkasanKas(rentangMundur(7)),
    ringkasanKas(rentangMundur(30)),
    db.catatanKas.findMany({
      orderBy: [{ tanggal: "desc" }, { dibuatPada: "desc" }],
      take: 80,
      include: { pesanan: { select: { kode: true } } },
    }),
  ]);

  // Dikelompokkan per hari supaya terbaca seperti buku kas tulis tangan.
  const perHari = new Map<string, typeof catatan>();
  for (const c of catatan) {
    const kunci = kunciHari(c.tanggal);
    perHari.set(kunci, [...(perHari.get(kunci) ?? []), c]);
  }

  const ringkasan = [
    { label: "Hari ini", data: kasHariIni },
    { label: "7 hari terakhir", data: kasMinggu },
    { label: "30 hari terakhir", data: kasBulan },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-kolom">Keuangan</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Buku kas</h1>
          <p className="mt-2 max-w-2xl text-arang-muda">
            Semua uang masuk dan keluar dicatat di sini. Pesanan yang Anda tandai
            lunas otomatis masuk, jadi tidak perlu dicatat dua kali.
          </p>
        </div>
        <Link href="/admin/laporan" className="tombol tombol-kedua">
          Lihat Laporan
        </Link>
      </header>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {ringkasan.map((r) => (
          <div key={r.label} className="kartu p-5">
            <p className="label-kolom">{r.label}</p>
            <p
              className={`mt-1 font-judul text-3xl ${
                r.data.selisih < 0 ? "text-bahaya" : "text-arang"
              }`}
            >
              {rupiah(r.data.selisih)}
            </p>
            <dl className="mt-3 space-y-1 text-[0.9rem]">
              <div className="flex justify-between">
                <dt className="text-arang-muda">Masuk</dt>
                <dd className="font-semibold text-daun-tua">
                  {rupiah(r.data.masuk)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-arang-muda">Keluar</dt>
                <dd className="font-semibold text-kayu-tua">
                  {rupiah(r.data.keluar)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-36">
            <FormKas hariIni={kunciHariIni} />
          </div>
        </div>

        <section className="lg:col-span-7 xl:col-span-8" aria-labelledby="judul-catatan">
          <h2 id="judul-catatan" className="text-2xl">
            Catatan terakhir
          </h2>

          {catatan.length === 0 ? (
            <p className="kartu mt-4 p-10 text-center text-arang-muda">
              Belum ada catatan kas.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {[...perHari.entries()].map(([kunci, baris]) => {
                const masuk = baris
                  .filter((b) => b.jenis === "MASUK")
                  .reduce((t, b) => t + b.jumlah, 0);
                const keluar = baris
                  .filter((b) => b.jenis === "KELUAR")
                  .reduce((t, b) => t + b.jumlah, 0);

                return (
                  <section key={kunci} aria-label={`Catatan ${kunci}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-judul text-lg">
                        {tanggalPanjang(baris[0].tanggal)}
                      </h3>
                      <p className="text-[0.9rem]">
                        <span className="text-daun-tua">+{rupiah(masuk)}</span>
                        <span className="text-arang-muda"> / </span>
                        <span className="text-kayu-tua">-{rupiah(keluar)}</span>
                      </p>
                    </div>

                    <ul className="kartu mt-2 divide-y divide-krem-tua">
                      {baris.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center gap-3 px-4 py-3"
                        >
                          <div className="min-w-[12rem] flex-1">
                            <p className="font-medium">{c.keterangan}</p>
                            <p className="flex flex-wrap items-center gap-2 text-[0.85rem] text-arang-muda">
                              <span>{c.kategori}</span>
                              {c.pesanan ? (
                                <Link
                                  href={`/admin/pesanan/${c.pesanan.kode}`}
                                  className="underline underline-offset-4"
                                >
                                  {c.pesanan.kode}
                                </Link>
                              ) : null}
                              {c.sumber === "PESANAN" ? (
                                <Lencana kelas="bg-krem-tua text-arang-muda border-kayu/25">
                                  Otomatis
                                </Lencana>
                              ) : null}
                            </p>
                          </div>

                          <p
                            className={`w-32 shrink-0 text-right font-judul text-lg ${
                              c.jenis === "MASUK" ? "text-daun-tua" : "text-kayu-tua"
                            }`}
                          >
                            {c.jenis === "MASUK" ? "+" : "-"}
                            {rupiah(c.jumlah)}
                          </p>

                          <div className="w-28 shrink-0 text-right">
                            {c.sumber === "MANUAL" ? (
                              <TombolHapusKas id={c.id} />
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
