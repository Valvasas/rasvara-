import Link from "next/link";
import {
  jamTampil,
  linkWhatsapp,
  menitSekarangWib,
  rupiah,
  sedangBuka,
  tanggalPanjang,
} from "@/lib/format";
import { jamSiapTercepatHariIni, labelDurasi, labelJamMenit } from "@/lib/jadwal";
import { ambilPengaturan, rekeningLengkap } from "@/lib/pengaturan";
import {
  ambilJadwalDapurHariIni,
  ambilMenuFavorit,
  ambilPetaTerjual,
  ambilRingkasanKategori,
} from "@/lib/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { Muncul } from "@/components/Muncul";
import { TandaMerek } from "@/components/TandaMerek";
import {
  IkonApi,
  IkonDompet,
  IkonJam,
  IkonKotakNasi,
  IkonNasiGoreng,
  IkonPanahKanan,
  IkonSnack,
  IkonTruk,
  IkonTumpeng,
  IkonWhatsapp,
} from "@/components/ikon/Ikon";
import type { KategoriMenu } from "@/generated/prisma/client";

const GAYA_KATEGORI: Record<KategoriMenu, { Ikon: typeof IkonKotakNasi; latar: string; ikon: string }> = {
  NASI_KOTAK: { Ikon: IkonKotakNasi, latar: "bg-pandan-lembut", ikon: "text-pandan-tua" },
  SNACK: { Ikon: IkonSnack, latar: "bg-arang-lembut", ikon: "text-arang" },
  TUMPENG: { Ikon: IkonTumpeng, latar: "bg-kunyit-lembut", ikon: "text-kunyit-tua" },
  NASI_GORENG: { Ikon: IkonNasiGoreng, latar: "bg-cabai-lembut", ikon: "text-cabai-tua" },
};

/** Empat tahap yang dilihat pembeli di halaman status — ditata seperti penggaris waktu. */
const ALUR = [
  { kode: "01", judul: "Pesan & jadwalkan", isi: "Pilih menu, tanggal, dan jam siap. Total final langsung terlihat — tidak ada biaya kejutan." },
  { kode: "02", judul: "Dikonfirmasi dapur", isi: "Dapur memeriksa kuota hari itu lalu menerima pesananmu. Kamu dapat kabar di halaman status." },
  { kode: "03", judul: "Dimasak hari-H", isi: "Dimasak di hari acara, dihitung mundur dari jam siap supaya tetap hangat saat dibuka." },
  { kode: "04", judul: "Siap tepat jamnya", isi: "Diantar atau diambil sesuai jadwal. Statusnya bisa kamu pantau dari ponsel." },
];

export default async function BerandaToko() {
  const [favorit, ringkasan, pengaturan, terjual, jadwal] = await Promise.all([
    ambilMenuFavorit(8),
    ambilRingkasanKategori(),
    ambilPengaturan(),
    ambilPetaTerjual(),
    ambilJadwalDapurHariIni(),
  ]);

  const kategoriAda = URUTAN_KATEGORI.map((k) => ringkasan.find((r) => r.kategori === k)).filter(
    (r): r is NonNullable<typeof r> => Boolean(r && r.jumlah > 0)
  );
  const hargaTermurah = kategoriAda.length ? Math.min(...kategoriAda.map((k) => k.hargaTermurah)) : null;
  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);
  const tercepat = jamSiapTercepatHariIni({ menitSekarang: menitSekarangWib(), jedaMenit: pengaturan.jedaMinimumMenit });

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
    { Ikon: IkonJam, judul: `Dapur ${jamTampil(pengaturan.jamBuka)}–${jamTampil(pengaturan.jamTutup)}`, isi: "Pesan online 24 jam" },
    {
      Ikon: IkonDompet,
      judul: rekeningLengkap(pengaturan) ? "Transfer atau tunai" : "Bayar tunai",
      isi: rekeningLengkap(pengaturan) ? `${pengaturan.namaBank} · bayar di tempat` : "Bayar saat pesanan diterima",
    },
  ];

  return (
    <>
      {/* ============ Kepala merek ============ */}
      <section className="permukaan-pandan relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-20 grid gap-10 lg:gap-14 lg:grid-cols-[1.15fr_1fr] items-center">
          <div>
            <p className="anim-masuk font-presisi text-[12px] sm:text-[13px] uppercase tracking-[0.18em] text-kunyit-terang">
              Nasi kotak · Tumpeng · Snack box · Nasi goreng
            </p>
            <h1
              className="anim-masuk font-tampil mt-4 text-[2.6rem] leading-[0.98] sm:text-[4.1rem] font-extrabold text-beras"
              style={{ ["--tunda" as string]: "60ms" }}
            >
              Matang sempurna,
              <br />
              tiba{" "}
              <span className="relative inline-block text-kunyit-terang">
                tepat waktu.
                <span aria-hidden="true" className="garis-ukur absolute -bottom-2 left-0 right-0 !opacity-60" />
              </span>
            </h1>
            <p
              className="anim-masuk mt-7 text-[17px] sm:text-lg text-beras/80 leading-relaxed max-w-xl"
              style={{ ["--tunda" as string]: "120ms" }}
            >
              Dimasak hari itu juga di dapur {pengaturan.namaUsaha}. Harga final terlihat sebelum pesan, jam siap
              dijadwalkan sampai menitnya, dan statusnya bisa kamu pantau dari ponsel.
            </p>

            <div className="anim-masuk mt-8 flex flex-col sm:flex-row gap-3" style={{ ["--tunda" as string]: "180ms" }}>
              <Link href="/menu" className="tombol-emas tombol-besar">
                Lihat menu &amp; pesan
                <IkonPanahKanan className="w-5 h-5" />
              </Link>
              <Link
                href="/lacak"
                className="tombol tombol-besar border border-white/25 text-beras hover:bg-white/10"
              >
                Lacak pesanan
              </Link>
            </div>

            {hargaTermurah !== null && (
              <p className="anim-masuk mt-6 font-presisi text-[13px] text-beras/70" style={{ ["--tunda" as string]: "240ms" }}>
                MULAI <span className="font-bold text-beras">{rupiah(hargaTermurah)}</span> / PORSI
              </p>
            )}
          </div>

          {/* Papan jadwal: janji "cepat & tepat" dalam angka nyata hari ini */}
          <div className="anim-masuk-skala" style={{ ["--tunda" as string]: "200ms" }}>
            <div className="text-arang drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]">
              <div className="tiket-atas px-5 sm:px-6 pt-5 pb-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="label-atas">Jadwal dapur hari ini</p>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold ${
                      buka ? "bg-pandan-lembut text-pandan-tua" : "bg-arang-lembut text-arang-sedang"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${buka ? "bg-pandan anim-denyut" : "bg-arang-sedang"}`} />
                    {buka ? "Buka" : "Tutup"}
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-arang-sedang">{tanggalPanjang(new Date())}</p>

                <div className="mt-4 flex items-end justify-between gap-4">
                  {/* Tanpa jeda persiapan dari pemilik, "siap tercepat" tidak bisa
                      dijanjikan dengan jujur — tampilkan jam layanan dapur saja. */}
                  <div>
                    <p className="text-[13px] font-semibold text-arang-sedang">
                      {tercepat !== null ? "Siap paling cepat hari ini" : "Jam layanan dapur"}
                    </p>
                    <p className="mt-1 font-presisi font-bold leading-none tracking-tight text-arang">
                      {tercepat !== null ? (
                        <span className="text-[2.6rem] sm:text-[3rem]">{labelJamMenit(tercepat)}</span>
                      ) : (
                        <span className="text-[2rem] sm:text-[2.4rem]">
                          {jamTampil(pengaturan.jamBuka)}–{jamTampil(pengaturan.jamTutup)}
                        </span>
                      )}
                      <span className="ml-1.5 text-[15px] font-semibold text-arang-sedang">WIB</span>
                    </p>
                  </div>
                  <TandaMerek ukuran={52} varian="polos" beranimasi className="shrink-0" />
                </div>
                {pengaturan.jedaMinimumMenit > 0 && (
                  <p className="mt-2 text-[13px] text-arang-sedang">
                    Dapur butuh {labelDurasi(pengaturan.jedaMinimumMenit)} persiapan untuk pesanan hari-H.
                  </p>
                )}
              </div>

              <div className="tiket-bawah px-5 sm:px-6 pt-5 pb-5">
                {jadwal.kuota.length > 0 ? (
                  <>
                    <p className="label-atas">Sisa kuota hari ini</p>
                    <ul className="mt-3 space-y-3">
                      {jadwal.kuota.map((k, i) => {
                        const persen = Math.round((k.sisa / k.kapasitas) * 100);
                        return (
                          <li key={k.slug}>
                            <Link href={`/menu/${k.slug}`} className="group block">
                              <span className="flex items-baseline justify-between gap-3 text-[14px]">
                                <span className="min-w-0 truncate font-semibold group-hover:text-pandan-tua">{k.nama}</span>
                                <span className="shrink-0 font-presisi text-[13px] text-arang-sedang">
                                  <span className={`font-bold ${k.sisa === 0 ? "text-cabai-tua" : "text-arang"}`}>{k.sisa}</span>/{k.kapasitas}
                                </span>
                              </span>
                              <span className="mt-1.5 block h-1.5 rounded-full bg-beras-tua overflow-hidden">
                                <span
                                  className={`block h-full rounded-full anim-tumbuh-datar ${persen <= 15 ? "bg-cabai" : "bg-pandan"}`}
                                  style={{ width: `${Math.max(2, persen)}%`, ["--tunda" as string]: `${300 + i * 90}ms` }}
                                />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="text-[14px] text-arang-sedang">
                    <span className="font-semibold text-arang">{jadwal.bisaHariIni} menu</span> bisa dipesan untuk hari ini juga.
                  </p>
                )}
                {jadwal.preorderTerlama > 0 && (
                  <p className="mt-4 flex items-start gap-2 text-[13px] leading-snug text-arang-sedang">
                    <span className="cap-presisi">H-{jadwal.preorderTerlama}</span>
                    Tumpeng &amp; menu besar dipesan paling lambat {jadwal.preorderTerlama} hari sebelumnya.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Kategori ============ */}
      {kategoriAda.length > 0 && (
        <section aria-labelledby="judul-kategori" className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="label-atas">Katalog</p>
              <h2 id="judul-kategori" className="judul-bagian mt-1 !text-2xl sm:!text-3xl">
                Mau pesan apa?
              </h2>
            </div>
          </div>
          <ul className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kategoriAda.map((k, i) => {
              const g = GAYA_KATEGORI[k.kategori];
              return (
                <li key={k.kategori} className="anim-masuk" style={{ ["--tunda" as string]: `${i * 60}ms` }}>
                  <Link
                    href={`/menu?kategori=${k.kategori}`}
                    className="group flex items-center gap-3 sm:gap-4 h-full kartu p-3 sm:p-4 kartu-interaktif"
                  >
                    <span
                      className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-[12px] ${g.latar} ${g.ikon} flex items-center justify-center transition-transform duration-300 group-hover:-rotate-6`}
                    >
                      <g.Ikon className="w-7 h-7" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] sm:text-base font-bold text-arang leading-tight">
                        {LABEL_KATEGORI[k.kategori]}
                      </span>
                      <span className="block font-presisi text-[11.5px] sm:text-[12px] uppercase text-arang-sedang mt-1">
                        {k.jumlah} menu · {rupiah(k.hargaTermurah)}+
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ============ Info layanan ============ */}
      <section aria-label="Info layanan" className="mx-auto max-w-6xl px-4 sm:px-6 pt-4">
        <ul className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto tanpa-scrollbar snap-x">
          {infoLayanan.map(({ Ikon, judul, isi }) => (
            <li
              key={judul}
              className="snap-start shrink-0 w-[78%] sm:w-auto flex items-center gap-3 rounded-[12px] border border-dashed border-beras-gelap bg-white/60 px-4 py-3"
            >
              <Ikon className="w-5 h-5 shrink-0 text-pandan" />
              <span className="min-w-0">
                <span className="block font-semibold text-arang leading-tight">{judul}</span>
                <span className="block text-[13px] text-arang-sedang mt-0.5 truncate">{isi}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ============ Terlaris ============ */}
      <section aria-labelledby="judul-favorit" className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label-atas flex items-center gap-1.5">
              {favorit.dariPesanan && <IkonApi className="w-3.5 h-3.5 text-cabai" />}
              {favorit.dariPesanan ? "90 hari terakhir" : "Rekomendasi dapur"}
            </p>
            <h2 id="judul-favorit" className="judul-bagian mt-1 !text-2xl sm:!text-3xl">
              {favorit.dariPesanan ? "Paling sering dipesan" : "Pilihan dari dapur kami"}
            </h2>
          </div>
          <Link
            href="/menu"
            className="shrink-0 inline-flex items-center gap-1 min-h-[44px] text-[15px] font-semibold text-pandan-tua hover:text-pandan"
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

      {/* ============ Alur: penggaris waktu ============ */}
      <section aria-labelledby="judul-cara" className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 items-start">
          <div className="lg:sticky lg:top-24">
            <p className="label-atas">Cara kerja dapur</p>
            <h2 id="judul-cara" className="font-tampil mt-2 text-[2rem] sm:text-[2.6rem] font-extrabold text-arang leading-[1.02]">
              Presisi dari
              <br />
              pesan sampai siap.
            </h2>
            <p className="teks-redup mt-4 max-w-md">
              Tanpa telepon bolak-balik. Setiap tahap tercatat dengan jam, jadi kamu selalu tahu masakanmu sedang di mana.
            </p>
            <Link href="/menu" className="tombol-utama mt-6">
              Mulai pesan
              <IkonPanahKanan className="w-4 h-4" />
            </Link>
          </div>

          <ol className="relative">
            <span aria-hidden="true" className="absolute left-[19px] top-3 bottom-3 w-px bg-beras-gelap" />
            {ALUR.map((a, i) => (
              <Muncul as="li" key={a.kode} tunda={i * 90} className="relative flex gap-5 pb-8 last:pb-0">
                <span className="relative z-10 w-10 h-10 shrink-0 rounded-full bg-white border-2 border-pandan text-pandan-tua font-presisi text-[13px] font-bold flex items-center justify-center">
                  {a.kode}
                </span>
                <span className="pt-1.5">
                  <span className="block font-tampil text-xl font-bold text-arang">{a.judul}</span>
                  <span className="block mt-1.5 text-[15px] text-arang-sedang leading-relaxed max-w-lg">{a.isi}</span>
                </span>
              </Muncul>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ Konsultasi ============ */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24">
        <Muncul className="relative overflow-hidden rounded-[18px] border border-kunyit/40 bg-kunyit-lembut p-6 sm:p-10 grid gap-6 lg:grid-cols-[1fr_auto] items-center">
          <div className="relative">
            <p className="label-atas !text-kunyit-tua">Acara besar · menu khusus</p>
            <h2 className="font-tampil mt-2 text-[1.75rem] sm:text-[2.2rem] font-extrabold text-arang leading-[1.08] max-w-2xl">
              Hitung porsi &amp; anggaran bareng dapur — gratis konsultasi.
            </h2>
            <p className="mt-3 text-arang-sedang max-w-xl">
              Pernikahan, syukuran, rapat kantor: ceritakan jumlah tamu &amp; anggaranmu, kami bantu susun menu yang pas
              porsinya.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="tombol-utama tombol-besar">
                <IkonWhatsapp className="w-5 h-5" />
                Konsultasi via WhatsApp
              </a>
            )}
            <Link href="/menu" className="tombol-kedua tombol-besar">
              Lihat semua menu
            </Link>
          </div>
        </Muncul>
      </section>
    </>
  );
}
