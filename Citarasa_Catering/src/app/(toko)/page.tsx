import Link from "next/link";
import { jamTampil, linkWhatsapp, rupiah, sedangBuka } from "@/lib/format";
import { ambilPengaturan, rekeningLengkap } from "@/lib/pengaturan";
import { ambilMenuFavorit, ambilPetaTerjual, ambilRingkasanKategori } from "@/lib/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { Muncul } from "@/components/Muncul";
import { IlustrasiHero, IlustrasiKoki } from "@/components/ilustrasi/Ilustrasi";
import {
  IkonApi,
  IkonDompet,
  IkonJam,
  IkonKalender,
  IkonKeranjang,
  IkonKotakNasi,
  IkonMangkuk,
  IkonNasiGoreng,
  IkonPanahKanan,
  IkonSnack,
  IkonStruk,
  IkonTruk,
  IkonTumpeng,
  IkonWhatsapp,
} from "@/components/ikon/Ikon";
import type { KategoriMenu } from "@/generated/prisma/client";

const GAYA_KATEGORI: Record<KategoriMenu, { Ikon: typeof IkonKotakNasi; latar: string; ikon: string }> = {
  NASI_KOTAK: { Ikon: IkonKotakNasi, latar: "bg-bata-lembut", ikon: "text-bata-tua" },
  SNACK: { Ikon: IkonSnack, latar: "bg-kunyit-lembut", ikon: "text-kunyit-tua" },
  TUMPENG: { Ikon: IkonTumpeng, latar: "bg-daun-lembut", ikon: "text-daun-tua" },
  NASI_GORENG: { Ikon: IkonNasiGoreng, latar: "bg-[#F3E4DA]", ikon: "text-bata-tua" },
};

const LANGKAH = [
  { judul: "Pilih menu", isi: "Tekan “Tambah” di menu yang kamu mau. Bisa campur banyak menu.", Ikon: IkonMangkuk },
  { judul: "Cek keranjang", isi: "Atur jumlah porsi. Total harga langsung terlihat.", Ikon: IkonKeranjang },
  { judul: "Atur jadwal & bayar", isi: "Pilih tanggal, jam, diantar atau ambil. Transfer atau tunai.", Ikon: IkonKalender },
  { judul: "Pantau pesanan", isi: "Lihat status masakanmu dari ponsel, kapan saja.", Ikon: IkonStruk },
];

export default async function BerandaToko() {
  const [favorit, ringkasan, pengaturan, terjual] = await Promise.all([
    ambilMenuFavorit(8),
    ambilRingkasanKategori(),
    ambilPengaturan(),
    ambilPetaTerjual(),
  ]);

  const kategoriAda = URUTAN_KATEGORI.map((k) => ringkasan.find((r) => r.kategori === k)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r && r.jumlah > 0)
  );
  const hargaTermurah = kategoriAda.length
    ? Math.min(...kategoriAda.map((k) => k.hargaTermurah))
    : null;
  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);

  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(
        pengaturan.whatsapp,
        `Halo ${pengaturan.namaUsaha}, saya mau konsultasi menu untuk acara dengan jumlah tamu ...`
      )
    : null;

  // Info layanan hanya dari pengaturan yang benar-benar diisi pemilik — tidak
  // ada janji yang tidak bisa ditepati dapur.
  const infoLayanan = [
    pengaturan.ongkirDefault === 0
      ? { Ikon: IkonTruk, judul: "Gratis ongkir", isi: "Untuk semua pesanan diantar" }
      : pengaturan.minOrderAntar > 0
      ? { Ikon: IkonTruk, judul: "Gratis ongkir", isi: `Belanja min. ${rupiah(pengaturan.minOrderAntar)}` }
      : { Ikon: IkonTruk, judul: "Diantar atau ambil", isi: `Ongkir ${rupiah(pengaturan.ongkirDefault)}` },
    { Ikon: IkonJam, judul: `Buka ${jamTampil(pengaturan.jamBuka)}–${jamTampil(pengaturan.jamTutup)}`, isi: "Pesan online 24 jam" },
    {
      Ikon: IkonDompet,
      judul: rekeningLengkap(pengaturan) ? "Transfer atau tunai" : "Bayar tunai",
      isi: rekeningLengkap(pengaturan) ? `${pengaturan.namaBank} · bayar di tempat` : "Bayar saat pesanan diterima",
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="permukaan-hangat border-b border-krem-gelap/60 overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-10 sm:pt-12 sm:pb-16 grid gap-4 md:gap-8 md:grid-cols-[1.05fr_1fr] items-center">
          <div className="order-2 md:order-1">
            <p className="anim-masuk inline-flex items-center gap-2 rounded-full bg-white/80 border border-krem-gelap px-3 py-1.5 text-[14px] font-semibold text-kayu">
              <span className="relative flex w-2.5 h-2.5">
                <span className={`absolute inset-0 rounded-full ${buka ? "bg-daun anim-denyut" : "bg-kayu-sedang"}`} />
              </span>
              {buka ? "Dapur sedang buka" : `Dapur buka pukul ${jamTampil(pengaturan.jamBuka)}`}
              <span className="text-kayu-sedang font-medium">· pesan kapan saja</span>
            </p>
            <h1
              className="anim-masuk font-tampil mt-4 text-[2.15rem] leading-[1.12] sm:text-5xl font-bold text-kayu"
              style={{ ["--tunda" as string]: "60ms" }}
            >
              Nasi kotak, tumpeng &amp; snack box{" "}
              <span className="relative whitespace-nowrap text-bata">
                untuk acaramu
                <svg aria-hidden="true" viewBox="0 0 200 12" className="absolute left-0 -bottom-1.5 w-full h-3 text-kunyit">
                  <path d="M2 8 C 50 2, 150 2, 198 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            </h1>
            <p
              className="anim-masuk mt-5 text-[17px] sm:text-lg text-kayu-sedang leading-relaxed max-w-xl"
              style={{ ["--tunda" as string]: "120ms" }}
            >
              Dimasak hari itu juga, siap tepat di jam acara. Pilih menu, masukkan keranjang, lalu pantau
              masakanmu dari ponsel.
            </p>

            <div className="anim-masuk mt-7 flex flex-col sm:flex-row gap-3" style={{ ["--tunda" as string]: "180ms" }}>
              <Link href="/menu" className="tombol-utama tombol-besar">
                Lihat menu &amp; pesan
                <IkonPanahKanan className="w-5 h-5" />
              </Link>
              <Link href="/lacak" className="tombol-kedua tombol-besar">
                Lacak pesanan
              </Link>
            </div>

            {hargaTermurah !== null && (
              <p className="anim-masuk mt-5 text-[15px] text-kayu-sedang" style={{ ["--tunda" as string]: "240ms" }}>
                Mulai <span className="font-bold text-kayu angka-tabel">{rupiah(hargaTermurah)}</span> per porsi
              </p>
            )}
          </div>

          <div className="order-1 md:order-2 anim-masuk-skala">
            <IlustrasiHero className="w-full max-w-[300px] sm:max-w-[420px] md:max-w-none mx-auto" />
          </div>
        </div>
      </section>

      {/* Kategori — deret ikon bundar ala marketplace */}
      {kategoriAda.length > 0 && (
        <section aria-labelledby="judul-kategori" className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12">
          <h2 id="judul-kategori" className="judul-bagian">
            Mau pesan apa?
          </h2>
          <ul className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
            {kategoriAda.map((k, i) => {
              const g = GAYA_KATEGORI[k.kategori];
              return (
                <li key={k.kategori} className="anim-masuk" style={{ ["--tunda" as string]: `${i * 60}ms` }}>
                  <Link
                    href={`/menu?kategori=${k.kategori}`}
                    className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-4 h-full rounded-2xl p-2 sm:p-4 sm:bg-white sm:border sm:border-krem-gelap text-center sm:text-left transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 sm:hover:shadow-[var(--shadow-angkat)] sm:hover:border-bata/30"
                  >
                    <span
                      className={`w-16 h-16 sm:w-14 sm:h-14 shrink-0 rounded-full sm:rounded-2xl ${g.latar} ${g.ikon} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                    >
                      <g.Ikon className="w-8 h-8 sm:w-7 sm:h-7" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] sm:text-base font-semibold text-kayu leading-tight">
                        {LABEL_KATEGORI[k.kategori]}
                      </span>
                      <span className="hidden sm:block text-[13px] text-kayu-sedang mt-0.5">
                        {k.jumlah} menu · mulai {rupiah(k.hargaTermurah)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Info layanan */}
      <section aria-label="Info layanan" className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8">
        <ul className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto tanpa-scrollbar snap-x">
          {infoLayanan.map(({ Ikon, judul, isi }) => (
            <li
              key={judul}
              className="snap-start shrink-0 w-[78%] sm:w-auto flex items-center gap-3 rounded-2xl bg-kunyit-lembut/70 border border-kunyit/25 px-4 py-3"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white text-kunyit-tua flex items-center justify-center">
                <Ikon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-kayu leading-tight">{judul}</span>
                <span className="block text-[13px] text-kunyit-tua mt-0.5 truncate">{isi}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Terlaris */}
      <section aria-labelledby="judul-favorit" className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="judul-favorit" className="flex items-center gap-2 font-tampil text-2xl sm:text-3xl font-bold text-kayu">
              {favorit.dariPesanan && <IkonApi className="w-7 h-7 text-bata" />}
              {favorit.dariPesanan ? "Paling laris" : "Pilihan dari dapur kami"}
            </h2>
            {favorit.dariPesanan && (
              <p className="teks-redup mt-1">Paling sering dipesan 3 bulan terakhir.</p>
            )}
          </div>
          <Link
            href="/menu"
            className="shrink-0 inline-flex items-center gap-1 min-h-[44px] text-[15px] font-semibold text-bata hover:text-bata-tua"
          >
            Lihat semua <IkonPanahKanan className="w-4 h-4" />
          </Link>
        </div>

        {favorit.daftar.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {favorit.daftar.map((menu, i) => (
              <Muncul key={menu.id} tunda={(i % 4) * 60}>
                <KartuMenu
                  menu={menu}
                  prioritas={i < 2}
                  terjual={terjual.get(menu.id) ?? 0}
                  peringkat={favorit.dariPesanan ? i + 1 : undefined}
                />
              </Muncul>
            ))}
          </div>
        ) : (
          <p className="mt-6 kartu kartu-isi text-center teks-redup">
            Menu sedang disiapkan. Silakan kembali sebentar lagi.
          </p>
        )}
      </section>

      {/* Cara pesan */}
      <section aria-labelledby="judul-cara" className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20">
        <h2 id="judul-cara" className="font-tampil text-2xl sm:text-3xl font-bold text-kayu text-center">
          Pesan semudah belanja online
        </h2>
        <p className="teks-redup mt-2 text-center">Empat langkah, tanpa perlu telepon bolak-balik.</p>
        <ol className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <span
            aria-hidden="true"
            className="hidden lg:block absolute top-8 left-[12%] right-[12%] border-t-2 border-dashed border-kunyit/50"
          />
          {LANGKAH.map(({ judul, isi, Ikon }, i) => (
            <Muncul as="li" key={judul} tunda={i * 90} className="relative kartu p-5 lg:bg-transparent lg:border-0 lg:text-center">
              <span className="relative z-10 mx-0 lg:mx-auto w-16 h-16 rounded-2xl bg-white border-2 border-kunyit/40 text-bata flex items-center justify-center shadow-[var(--shadow-lembut)]">
                <Ikon className="w-7 h-7" />
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-bata text-white text-sm font-bold flex items-center justify-center ring-4 ring-krem">
                  {i + 1}
                </span>
              </span>
              <p className="mt-4 text-lg font-bold text-kayu">{judul}</p>
              <p className="mt-1 text-[15px] text-kayu-sedang leading-relaxed">{isi}</p>
            </Muncul>
          ))}
        </ol>
      </section>

      {/* Konsultasi */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
        <Muncul className="relative overflow-hidden rounded-3xl bg-kayu text-white p-6 sm:p-10 grid gap-6 sm:grid-cols-[1fr_auto] items-center">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-bata/30 blur-2xl"
          />
          <div className="relative">
            <p className="text-[15px] font-semibold text-kunyit-terang">Acara besar atau menu khusus?</p>
            <h2 className="font-tampil mt-2 text-2xl sm:text-3xl font-bold leading-tight">
              Ngobrol langsung dengan dapur, gratis konsultasi.
            </h2>
            <p className="mt-3 text-white/80 max-w-lg">
              Pernikahan, syukuran, rapat kantor — ceritakan jumlah tamu &amp; anggaranmu, kami bantu susun menunya.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {waUrl ? (
                <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-wa tombol-besar">
                  <IkonWhatsapp className="w-5 h-5" />
                  Chat WhatsApp
                </a>
              ) : null}
              <Link href="/menu" className="tombol tombol-besar bg-white/10 text-white hover:bg-white/20 border border-white/20">
                Lihat semua menu
              </Link>
            </div>
          </div>
          <IlustrasiKoki className="relative hidden sm:block w-48 lg:w-56" />
        </Muncul>
      </section>
    </>
  );
}
