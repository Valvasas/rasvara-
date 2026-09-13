import Link from "next/link";
import { db } from "@/lib/db";
import { ambilPengaturan } from "@/lib/pengaturan";
import { Lencana, Titik } from "@/components/Lencana";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import {
  jamTampil,
  linkWhatsapp,
  rupiah,
  sedangBuka,
  tanggalPanjang,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const CARA_PESAN = [
  {
    judul: "Pilih menu dan jumlahnya",
    isi: "Buka daftar menu, tentukan berapa kotak atau porsi yang dibutuhkan. Harga langsung terhitung, tidak ada biaya yang muncul belakangan.",
  },
  {
    judul: "Isi tanggal dan alamat",
    isi: "Beri tahu kapan pesanan dibutuhkan dan mau diambil sendiri atau diantar. Kami kabari lewat WhatsApp begitu pesanan diterima.",
  },
  {
    judul: "Kami masak dan antar tepat waktu",
    isi: "Bahan dibeli hari itu juga dan dimasak mendekati jam pengantaran, supaya sampai di tangan Anda masih hangat.",
  },
];

export default async function Beranda() {
  const [pengaturan, menu] = await Promise.all([
    ambilPengaturan(),
    db.menu.findMany({
      where: { aktif: true },
      orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
    }),
  ]);

  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);

  const kategori = URUTAN_KATEGORI.map((k) => {
    const isi = menu.filter((m) => m.kategori === k);
    return {
      kunci: k,
      label: LABEL_KATEGORI[k],
      jumlah: isi.length,
      hargaTerendah: isi.length ? Math.min(...isi.map((m) => m.harga)) : 0,
      contoh: isi.slice(0, 3).map((m) => m.nama),
      preorderHari: isi.length ? Math.max(...isi.map((m) => m.preorderHari)) : 0,
    };
  }).filter((k) => k.jumlah > 0);

  const siapHariIni = menu.filter((m) => m.preorderHari === 0);
  const perluAwal = menu.filter((m) => m.preorderHari > 0);

  return (
    <>
      {/* ---------- Bagian pembuka ---------- */}
      <section className="relative overflow-hidden border-b border-krem-tua tekstur-kertas">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-7">
            <p className="label-kolom">Dari dapur kami, sejak sore</p>

            <h1 className="mt-3 text-[2.6rem] leading-[1.08] sm:text-6xl">
              Masakan hangat,
              <br />
              <span className="text-bata">siap tepat waktu.</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-arang-muda">
              Snack box, nasi kotak, tumpeng, dan nasi goreng untuk rapat pagi,
              syukuran keluarga, sampai makan malam yang mendadak. Dipesan hari
              ini, dimasak hari ini.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pesan" className="tombol tombol-utama text-[1.05rem]">
                Buat Pesanan
              </Link>
              <Link href="/menu" className="tombol tombol-kedua text-[1.05rem]">
                Lihat Menu &amp; Harga
              </Link>
            </div>

            {pengaturan.whatsapp ? (
              <p className="mt-5 text-[0.95rem] text-arang-muda">
                Lebih nyaman lewat chat?{" "}
                <a
                  href={linkWhatsapp(
                    pengaturan.whatsapp,
                    "Halo Citarasa Catering, saya mau tanya menu dan harga."
                  )}
                  className="font-semibold text-bata underline underline-offset-4 hover:text-bata-tua"
                >
                  Tanya langsung lewat WhatsApp
                </a>
              </p>
            ) : null}
          </div>

          {/* Kartu ini dibuat menyerupai nota pesanan kertas, lengkap dengan tepi
              bergerigi. Lebih jujur menggambarkan usaha ini dibanding foto stok. */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="kartu overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-dashed border-krem-tua px-5 py-4">
                  <div>
                    <p className="label-kolom">Catatan hari ini</p>
                    <p className="mt-0.5 font-judul text-lg">
                      {tanggalPanjang(new Date())}
                    </p>
                  </div>
                  <Lencana
                    kelas={
                      buka
                        ? "bg-daun-lembut text-daun-tua border-daun/40"
                        : "bg-krem-tua text-arang-muda border-kayu/25"
                    }
                  >
                    <Titik kelas={buka ? "bg-daun" : "bg-arang-muda"} />
                    {buka ? "Buka" : "Tutup"}
                  </Lencana>
                </div>

                <dl className="divide-y divide-krem-tua px-5">
                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-arang-muda">Jam layanan</dt>
                    <dd className="text-right font-semibold">
                      {jamTampil(pengaturan.jamBuka)} -{" "}
                      {jamTampil(pengaturan.jamTutup)} WIB
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-arang-muda">Bisa untuk hari ini</dt>
                    <dd className="text-right font-semibold">
                      {siapHariIni.length} menu
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between gap-4 py-3">
                    <dt className="text-arang-muda">Perlu pesan lebih awal</dt>
                    <dd className="text-right font-semibold">
                      {perluAwal.length} menu
                    </dd>
                  </div>

                  {pengaturan.ongkirDefault > 0 ? (
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-arang-muda">Ongkos antar</dt>
                      <dd className="text-right font-semibold">
                        {rupiah(pengaturan.ongkirDefault)}
                        {pengaturan.minOrderAntar > 0 ? (
                          <span className="block text-[0.8rem] font-normal text-arang-muda">
                            gratis di atas {rupiah(pengaturan.minOrderAntar)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="bg-kunyit-lembut px-5 py-4">
                  <p className="text-[0.92rem] text-kunyit-tua">
                    Tumpeng dan pesanan di atas seratus kotak sebaiknya dipesan
                    beberapa hari sebelumnya supaya kami bisa siapkan dengan
                    tenang.
                  </p>
                </div>
              </div>

              {/* Tepi sobek nota */}
              <div
                aria-hidden="true"
                className="h-3 w-full"
                style={{
                  background:
                    "radial-gradient(circle at 6px -2px, transparent 6px, var(--color-kertas) 6.5px) repeat-x",
                  backgroundSize: "12px 12px",
                  filter: "drop-shadow(0 1px 0 var(--color-krem-tua))",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Kategori ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="judul-masakan">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-kolom">Yang kami masak</p>
            <h2 id="judul-masakan" className="mt-2 text-3xl sm:text-4xl">
              Empat andalan, dimasak tiap hari
            </h2>
          </div>
          <Link href="/menu" className="tombol tombol-kedua">
            Semua menu &amp; harga
          </Link>
        </div>

        <ul className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {kategori.map((k, i) => (
            <li key={k.kunci}>
              <Link
                href={`/menu#${k.kunci.toLowerCase()}`}
                className="kartu group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-hangat-lg"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 w-full ${
                    ["bg-bata", "bg-kunyit", "bg-daun", "bg-kayu"][i % 4]
                  }`}
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-judul text-xl">{k.label}</h3>
                  <p className="mt-2 flex-1 text-[0.92rem] text-arang-muda">
                    {k.contoh.join(", ")}
                    {k.jumlah > 3 ? `, dan ${k.jumlah - 3} lainnya` : ""}.
                  </p>
                  <p className="mt-4 text-[0.85rem] text-arang-muda">
                    Mulai dari
                  </p>
                  <p className="font-judul text-2xl text-bata">
                    {rupiah(k.hargaTerendah)}
                  </p>
                  {k.preorderHari > 0 ? (
                    <p className="mt-3 text-[0.85rem] text-kunyit-tua">
                      Pesan {k.preorderHari} hari sebelumnya
                    </p>
                  ) : (
                    <p className="mt-3 text-[0.85rem] text-daun-tua">
                      Bisa untuk hari ini
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Cerita ---------- */}
      <section
        id="cerita"
        aria-labelledby="judul-cerita"
        className="scroll-mt-24 border-y border-kayu/20 bg-kayu-lembut tekstur-kertas"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-5">
            <p className="label-kolom">Cerita kami</p>
            <blockquote className="mt-3">
              <p className="font-judul text-[2rem] leading-tight text-kayu-tua sm:text-[2.4rem]">
                &ldquo;Kalau lampu warung sudah menyala, artinya kami siap
                menerima pesanan.&rdquo;
              </p>
            </blockquote>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <h2 id="judul-cerita" className="khusus-pembaca-layar">
              Cerita Citarasa Catering
            </h2>
            <div className="space-y-4 text-[1.05rem] leading-relaxed text-arang">
              {(pengaturan.cerita || "")
                .split("\n")
                .filter(Boolean)
                .map((paragraf, i) => (
                  <p key={i}>{paragraf}</p>
                ))}
            </div>

            <dl className="mt-8 grid gap-5 sm:grid-cols-3">
              {[
                { angka: "Sejak sore", label: "Bahan mulai disiapkan" },
                { angka: "Tepat waktu", label: "Sampai sesuai jam diminta" },
                { angka: "Dimasak sendiri", label: "Bukan titipan dapur lain" },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="font-judul text-lg text-bata">{s.angka}</dt>
                  <dd className="text-[0.92rem] text-arang-muda">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- Cara pesan ---------- */}
      <section
        className="mx-auto max-w-6xl px-4 py-16"
        aria-labelledby="judul-cara"
      >
        <p className="label-kolom">Cara pesan</p>
        <h2 id="judul-cara" className="mt-2 text-3xl sm:text-4xl">
          Tiga langkah, tanpa aplikasi tambahan
        </h2>

        <ol className="mt-9 grid gap-6 md:grid-cols-3">
          {CARA_PESAN.map((langkah, i) => (
            <li key={langkah.judul} className="kartu p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bata-lembut font-judul text-xl font-semibold text-bata">
                {i + 1}
              </span>
              <h3 className="mt-4 font-judul text-xl">{langkah.judul}</h3>
              <p className="mt-2 text-[0.95rem] text-arang-muda">{langkah.isi}</p>
            </li>
          ))}
        </ol>

        <div className="kartu mt-10 flex flex-wrap items-center justify-between gap-5 bg-bata p-7 text-krem">
          <div>
            <h2 className="font-judul text-2xl text-krem sm:text-3xl">
              Sudah tahu mau pesan apa?
            </h2>
            <p className="mt-1 text-krem/85">
              Isi pesanan sekarang, kami balas lewat WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pesan"
              className="tombol bg-krem text-bata hover:bg-white"
            >
              Buat Pesanan
            </Link>
            <Link
              href="/lacak"
              className="tombol border-2 border-krem/40 bg-transparent text-krem hover:bg-white/10"
            >
              Lacak Pesanan
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
