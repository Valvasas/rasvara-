import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Lencana } from "@/components/Lencana";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { rupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu & Harga",
  description:
    "Daftar lengkap snack box, nasi kotak, tumpeng, dan nasi goreng Citarasa Catering beserta harganya.",
};

export default async function HalamanMenu() {
  const menu = await db.menu.findMany({
    where: { aktif: true },
    orderBy: [{ urutan: "asc" }, { nama: "asc" }],
  });

  const adaIsi = URUTAN_KATEGORI.filter((k) =>
    menu.some((m) => m.kategori === k)
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header>
        <p className="label-kolom">Menu &amp; harga</p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Semua yang bisa dipesan</h1>
        <p className="mt-4 max-w-2xl text-lg text-arang-muda">
          Harga sudah termasuk kemasan. Tidak ada biaya tersembunyi. Kalau butuh
          menu khusus atau jumlah besar, hubungi kami dan kami sesuaikan.
        </p>
      </header>

      {adaIsi.length === 0 ? (
        <p className="kartu mt-10 p-8 text-center text-arang-muda">
          Menu belum tersedia. Silakan kembali lagi nanti.
        </p>
      ) : (
        <>
          <nav aria-label="Pindah kategori" className="mt-8 flex flex-wrap gap-2">
            {adaIsi.map((k) => (
              <a
                key={k}
                href={`#${k.toLowerCase()}`}
                className="rounded-full border-2 border-krem-tua bg-kertas px-4 py-2 text-[0.95rem] font-medium transition-colors hover:border-kayu hover:bg-kayu-lembut"
              >
                {LABEL_KATEGORI[k]}
              </a>
            ))}
          </nav>

          {adaIsi.map((kategori) => {
            const isi = menu.filter((m) => m.kategori === kategori);
            return (
              <section
                key={kategori}
                id={kategori.toLowerCase()}
                className="mt-14 scroll-mt-32"
                aria-labelledby={`judul-${kategori.toLowerCase()}`}
              >
                <h2
                  id={`judul-${kategori.toLowerCase()}`}
                  className="border-b border-krem-tua pb-3 text-2xl sm:text-3xl"
                >
                  {LABEL_KATEGORI[kategori]}
                </h2>

                <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {isi.map((m) => (
                    <li key={m.id} className="kartu flex flex-col p-5">
                      <div className="flex flex-wrap gap-2">
                        {m.preorderHari > 0 ? (
                          <Lencana kelas="bg-kunyit-lembut text-kunyit-tua border-kunyit/40">
                            Pesan {m.preorderHari} hari sebelumnya
                          </Lencana>
                        ) : (
                          <Lencana kelas="bg-daun-lembut text-daun-tua border-daun/40">
                            Bisa untuk hari ini
                          </Lencana>
                        )}
                        {m.minPesan > 1 ? (
                          <Lencana kelas="bg-krem-tua text-arang-muda border-kayu/25">
                            Minimal {m.minPesan} {m.satuan}
                          </Lencana>
                        ) : null}
                      </div>

                      <h3 className="mt-3 font-judul text-xl">{m.nama}</h3>
                      <p className="mt-2 flex-1 text-[0.95rem] text-arang-muda">
                        {m.deskripsi}
                      </p>

                      <div className="mt-5 flex items-end justify-between gap-3 border-t border-krem-tua pt-4">
                        <p>
                          <span className="font-judul text-2xl text-bata">
                            {rupiah(m.harga)}
                          </span>
                          <span className="text-[0.9rem] text-arang-muda">
                            {" "}
                            / {m.satuan}
                          </span>
                        </p>
                        <Link
                          href={`/pesan?menu=${m.slug}`}
                          className="tombol tombol-kedua px-4 py-2"
                        >
                          Pilih
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}

      <div className="kartu mt-16 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-lg">
          Sudah menemukan yang dicari? Isi pesanannya sekarang.
        </p>
        <Link href="/pesan" className="tombol tombol-utama">
          Buat Pesanan
        </Link>
      </div>
    </div>
  );
}
