import Image from "next/image";
import Link from "next/link";
import { jamTampil, linkWhatsapp, rupiah } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { ambilMenuFavorit, ambilRingkasanKategori } from "@/lib/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { IlustrasiHero, IlustrasiKategori, LATAR_KATEGORI } from "@/components/ilustrasi/Ilustrasi";
import {
  IkonCabai,
  IkonHp,
  IkonJam,
  IkonKalender,
  IkonMangkuk,
  IkonNota,
  IkonPanahKanan,
  IkonWhatsapp,
} from "@/components/ikon/Ikon";

const LANGKAH = [
  { judul: "Pilih menu & jumlah", isi: "Campur beberapa menu dalam satu pesanan.", Ikon: IkonMangkuk },
  { judul: "Tentukan jadwal", isi: "Tanggal, jam acara, dan diantar atau diambil.", Ikon: IkonKalender },
  { judul: "Bayar & pantau", isi: "Transfer atau tunai. Status masakan bisa dilacak.", Ikon: IkonNota },
];

export default async function BerandaToko() {
  const [favorit, ringkasan, pengaturan] = await Promise.all([
    ambilMenuFavorit(6),
    ambilRingkasanKategori(),
    ambilPengaturan(),
  ]);

  const kategoriAda = URUTAN_KATEGORI.map((k) => ringkasan.find((r) => r.kategori === k)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r && r.jumlah > 0)
  );
  const hargaTermurah = kategoriAda.length
    ? Math.min(...kategoriAda.map((k) => k.hargaTermurah))
    : null;

  const fotoHero = favorit.daftar
    .filter((m) => m.foto.length > 0)
    .slice(0, 3)
    .map((m) => ({ url: m.foto[0].url, nama: m.nama, slug: m.slug }));

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(
        pengaturan.whatsapp,
        `Halo ${pengaturan.namaUsaha}, saya mau konsultasi menu untuk acara dengan jumlah tamu ...`
      )
    : null;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 latar-kawung [mask-image:radial-gradient(ellipse_70%_80%_at_85%_30%,#000_15%,transparent_75%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-12 sm:pt-12 sm:pb-20 grid grid-cols-1 gap-6 md:gap-8 lg:gap-10 items-center md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="anim-masuk">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-krem-gelap px-3 py-1 text-xs sm:text-sm font-medium text-bata-tua">
              <IkonCabai className="w-4 h-4" />
              Catering rumahan · pesan online
            </p>
            <h1 className="font-tampil mt-4 text-[2.15rem] leading-[1.12] sm:text-5xl md:text-[2.6rem] lg:text-5xl sm:leading-[1.08] font-bold text-kayu text-balance">
              Nasi kotak, tumpeng &amp; snack box untuk <span className="text-bata">acaramu</span>
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-kayu-sedang leading-relaxed max-w-xl">
              Dimasak di hari yang sama, siap tepat di jam acara. Pilih menu, atur jadwal, lalu pantau
              masakanmu dari ponsel.
            </p>

            <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              <Link href="/menu" className="tombol-utama tombol-besar px-5 sm:px-7">
                Lihat menu
                <IkonPanahKanan className="w-4 h-4" />
              </Link>
              <Link href="/pesan" className="tombol-kedua tombol-besar px-5 sm:px-7">
                Langsung pesan
              </Link>
            </div>

            <dl className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-md text-sm border-t border-krem-gelap pt-5 sm:pt-6">
              {hargaTermurah !== null && (
                <div>
                  <dt className="text-kayu-sedang text-xs sm:text-sm">Mulai</dt>
                  <dd className="mt-0.5 font-semibold text-kayu angka-tabel">{rupiah(hargaTermurah)}</dd>
                </div>
              )}
              <div>
                <dt className="text-kayu-sedang text-xs sm:text-sm">Pengambilan</dt>
                <dd className="mt-0.5 font-semibold text-kayu">Antar / ambil</dd>
              </div>
              <div>
                <dt className="text-kayu-sedang text-xs sm:text-sm">Bayar</dt>
                <dd className="mt-0.5 font-semibold text-kayu">Transfer / tunai</dd>
              </div>
            </dl>
          </div>

          {/* Ponsel: gambar di atas — makanan dilihat dulu sebelum dibaca. */}
          <div className="relative order-first md:order-last anim-masuk">
            {fotoHero.length > 0 ? (
              <div className="grid grid-cols-2 grid-rows-2 gap-3 aspect-[5/4] max-h-[260px] sm:max-h-none mx-auto">
                {fotoHero.map((f, i) => (
                  <Link
                    key={f.slug}
                    href={`/menu/${f.slug}`}
                    className={`group relative overflow-hidden rounded-2xl bg-krem-tua ${
                      i === 0 ? "row-span-2" : ""
                    } ${fotoHero.length === 1 ? "col-span-2" : ""} ${
                      fotoHero.length === 2 && i === 1 ? "row-span-2" : ""
                    }`}
                  >
                    <Image
                      src={f.url}
                      alt={f.nama}
                      fill
                      priority={i === 0}
                      sizes="(min-width: 1024px) 300px, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <IlustrasiHero className="w-full max-w-[300px] sm:max-w-[440px] lg:max-w-[540px] mx-auto" />
            )}

            {/* Janji layanan yang memang dipenuhi sistem, bukan klaim pemasaran. */}
            <p className="hidden sm:flex absolute top-[8%] left-0 lg:-left-4 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-kayu shadow-[var(--shadow-angkat)]">
              <span className="w-7 h-7 rounded-full bg-kunyit-lembut text-kunyit-tua flex items-center justify-center">
                <IkonJam className="w-4 h-4" />
              </span>
              Siap di jam acaramu
            </p>
            <p className="hidden sm:flex absolute bottom-[6%] right-0 lg:-right-2 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-kayu shadow-[var(--shadow-angkat)]">
              <span className="w-7 h-7 rounded-full bg-daun-lembut text-daun-tua flex items-center justify-center">
                <IkonHp className="w-4 h-4" />
              </span>
              Status bisa dilacak
            </p>
          </div>
        </div>
      </section>

      {/* Kategori */}
      {kategoriAda.length > 0 && (
        <section aria-labelledby="judul-kategori" className="bg-krem-tua/60 border-y border-krem-gelap/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
            <h2 id="judul-kategori" className="font-tampil text-2xl sm:text-3xl font-bold text-kayu">
              Mau pesan apa?
            </h2>
            <ul className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {kategoriAda.map((k) => (
                <li key={k.kategori}>
                  <Link
                    href={`/menu?kategori=${k.kategori}`}
                    className="group flex h-full flex-col rounded-2xl bg-white border border-krem-gelap overflow-hidden transition-[box-shadow,border-color,transform] duration-300 hover:border-bata/30 hover:shadow-[var(--shadow-angkat)] sm:hover:-translate-y-0.5"
                  >
                    <span className={`block aspect-[16/10] latar-kawung-tipis ${LATAR_KATEGORI[k.kategori]}`}>
                      <IlustrasiKategori
                        kategori={k.kategori}
                        className="w-full h-full p-2 transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    </span>
                    <span className="flex items-end justify-between gap-2 p-3 sm:p-4">
                      <span className="min-w-0">
                        <span className="block font-semibold text-kayu">{LABEL_KATEGORI[k.kategori]}</span>
                        <span className="block text-xs text-kayu-sedang mt-0.5">
                          {k.jumlah} menu · mulai {rupiah(k.hargaTermurah)}
                        </span>
                      </span>
                      <IkonPanahKanan className="hidden sm:block w-4 h-4 shrink-0 text-kayu-sedang transition-transform group-hover:translate-x-0.5 group-hover:text-bata" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Favorit */}
      <section aria-labelledby="judul-favorit" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="judul-favorit" className="font-tampil text-2xl sm:text-3xl font-bold text-kayu">
              {favorit.dariPesanan ? "Paling sering dipesan" : "Pilihan dari dapur kami"}
            </h2>
            {favorit.dariPesanan && (
              <p className="teks-redup mt-1">Berdasarkan pesanan 3 bulan terakhir.</p>
            )}
          </div>
          <Link
            href="/menu"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-bata hover:text-bata-tua"
          >
            Semua menu <IkonPanahKanan className="w-4 h-4" />
          </Link>
        </div>

        {favorit.daftar.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:gap-5 sm:grid-cols-2 md:grid-cols-3">
            {favorit.daftar.map((menu, i) => (
              <KartuMenu key={menu.id} menu={menu} prioritas={i < 3 && fotoHero.length === 0} />
            ))}
          </div>
        ) : (
          <p className="mt-6 kartu kartu-isi text-center teks-redup">
            Menu sedang disiapkan. Silakan kembali sebentar lagi.
          </p>
        )}

        <Link href="/menu" className="sm:hidden mt-6 tombol-kedua w-full">
          Lihat semua menu
          <IkonPanahKanan className="w-4 h-4" />
        </Link>
      </section>

      {/* Cara pesan */}
      <section aria-labelledby="judul-cara" className="mx-auto max-w-6xl px-4 sm:px-6 pb-14 sm:pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-krem-gelap bg-white">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 pita-merek" />
          <div className="p-6 sm:p-8">
            <h2 id="judul-cara" className="font-tampil text-2xl font-bold text-kayu">
              Cara pesan
            </h2>
            <p className="teks-redup mt-1">Tiga langkah, tanpa perlu daftar akun.</p>
            <ol className="relative mt-7 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
              {/* garis penghubung antarlangkah di layar lebar */}
              <span
                aria-hidden="true"
                className="hidden sm:block absolute top-6 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] border-t-2 border-dashed border-krem-gelap"
              />
              {LANGKAH.map((l, i) => (
                <li key={l.judul} className="relative flex sm:flex-col sm:items-center sm:text-center gap-4">
                  <span className="relative shrink-0 w-12 h-12 rounded-2xl bg-bata-lembut text-bata-tua flex items-center justify-center ring-4 ring-white">
                    <l.Ikon className="w-6 h-6" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-kayu text-white text-[11px] font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <p className="font-semibold text-kayu">{l.judul}</p>
                    <p className="text-sm text-kayu-sedang mt-1">{l.isi}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-krem-gelap bg-krem-tua/50 latar-kawung px-6 py-5 sm:px-8">
            <div>
              <p className="font-semibold text-kayu">Acara besar atau butuh menu khusus?</p>
              <p className="text-sm text-kayu-sedang mt-0.5">
                Tanya langsung ke dapur. Dapur aktif pukul {jamTampil(pengaturan.jamBuka)}–{jamTampil(pengaturan.jamTutup)} WIB.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-kedua flex-1 sm:flex-none">
                  <IkonWhatsapp className="w-4 h-4 text-daun" />
                  Chat WhatsApp
                </a>
              )}
              <Link href="/pesan" className="tombol-utama flex-1 sm:flex-none">
                Mulai pesan
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
