import Image from "next/image";
import Link from "next/link";
import { linkWhatsapp, rupiah } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { ambilMenuFavorit, ambilRingkasanKategori } from "@/lib/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { KartuMenu } from "@/components/toko/KartuMenu";
import {
  IkonKotakNasi,
  IkonNasiGoreng,
  IkonPanahKanan,
  IkonSnack,
  IkonTumpeng,
  IkonWhatsapp,
} from "@/components/ikon/Ikon";
import type { KategoriMenu } from "@/generated/prisma/client";

const IKON_KATEGORI: Record<KategoriMenu, typeof IkonKotakNasi> = {
  NASI_KOTAK: IkonKotakNasi,
  SNACK: IkonSnack,
  TUMPENG: IkonTumpeng,
  NASI_GORENG: IkonNasiGoreng,
};

const LANGKAH = [
  { judul: "Pilih menu & jumlah", isi: "Campur beberapa menu dalam satu pesanan." },
  { judul: "Tentukan jadwal", isi: "Tanggal, jam acara, dan diantar atau diambil." },
  { judul: "Bayar & pantau", isi: "Transfer atau tunai. Status masakan bisa dilacak." },
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
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div
          className={`grid gap-10 items-center ${fotoHero.length ? "lg:grid-cols-[1.05fr_1fr]" : ""}`}
        >
          <div className={`anim-masuk ${fotoHero.length ? "" : "max-w-2xl"}`}>
            <p className="text-sm font-medium text-bata">Catering rumahan · pesan online</p>
            <h1 className="font-tampil mt-3 text-4xl sm:text-5xl font-bold text-kayu leading-[1.1]">
              Nasi kotak, tumpeng &amp; snack box untuk acaramu
            </h1>
            <p className="mt-5 text-lg text-kayu-sedang leading-relaxed max-w-xl">
              Dimasak di hari yang sama, siap tepat di jam acara. Pilih menu, atur jadwal, lalu
              pantau masakanmu dari ponsel.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/menu" className="tombol-utama tombol-besar">
                Lihat menu
                <IkonPanahKanan className="w-4 h-4" />
              </Link>
              <Link href="/lacak" className="tombol-kedua tombol-besar">
                Lacak pesanan
              </Link>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md text-sm border-t border-krem-gelap pt-6">
              {hargaTermurah !== null && (
                <div>
                  <dt className="text-kayu-sedang">Mulai</dt>
                  <dd className="mt-0.5 font-semibold text-kayu angka-tabel">{rupiah(hargaTermurah)}</dd>
                </div>
              )}
              <div>
                <dt className="text-kayu-sedang">Pengambilan</dt>
                <dd className="mt-0.5 font-semibold text-kayu">Antar / ambil</dd>
              </div>
              <div>
                <dt className="text-kayu-sedang">Bayar</dt>
                <dd className="mt-0.5 font-semibold text-kayu">Transfer / tunai</dd>
              </div>
            </dl>
          </div>

          {fotoHero.length > 0 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-3 aspect-[5/4] anim-masuk">
              {fotoHero.map((f, i) => (
                <Link
                  key={f.slug}
                  href={`/menu/${f.slug}`}
                  className={`relative overflow-hidden rounded-2xl bg-krem-tua ${
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
                    className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Kategori */}
      {kategoriAda.length > 0 && (
        <section aria-labelledby="judul-kategori" className="bg-krem-tua/60 border-y border-krem-gelap/70">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
            <h2 id="judul-kategori" className="judul-bagian">
              Mau pesan apa?
            </h2>
            <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {kategoriAda.map((k) => {
                const Ikon = IKON_KATEGORI[k.kategori];
                return (
                  <li key={k.kategori}>
                    <Link
                      href={`/menu?kategori=${k.kategori}`}
                      className="flex h-full items-center gap-4 rounded-2xl bg-white border border-krem-gelap p-4 transition-colors hover:border-bata/40"
                    >
                      <span className="w-11 h-11 shrink-0 rounded-xl bg-bata-lembut text-bata-tua flex items-center justify-center">
                        <Ikon className="w-6 h-6" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-kayu">
                          {LABEL_KATEGORI[k.kategori]}
                        </span>
                        <span className="block text-xs text-kayu-sedang mt-0.5">
                          {k.jumlah} menu · mulai {rupiah(k.hargaTermurah)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Favorit */}
      <section aria-labelledby="judul-favorit" className="mx-auto max-w-6xl px-4 sm:px-6 py-14">
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
          <div className="mt-6 grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        </Link>
      </section>

      {/* Cara pesan */}
      <section aria-labelledby="judul-cara" className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="kartu p-6 sm:p-8">
          <h2 id="judul-cara" className="judul-bagian">
            Cara pesan
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="flex gap-4">
                <span className="w-8 h-8 shrink-0 rounded-full bg-kayu text-white text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-kayu">{l.judul}</p>
                  <p className="text-sm text-kayu-sedang mt-1">{l.isi}</p>
                </div>
              </li>
            ))}
          </ol>

          {waUrl && (
            <div className="mt-8 pt-6 border-t border-krem-gelap flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-kayu-sedang">
                Acara besar atau butuh menu khusus? Tanya langsung ke dapur.
              </p>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-kedua">
                <IkonWhatsapp className="w-4 h-4 text-daun" />
                Chat WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
