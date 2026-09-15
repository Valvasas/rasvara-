import Link from "next/link";
import { ambilMenuAktif } from "@/lib/menu";
import { rupiah } from "@/lib/format";
import {
  LABEL_KATEGORI,
  URUTAN_KATEGORI,
} from "@/lib/pesanan";
import { LencanaKategori } from "@/components/Lencana";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";
import { KomponenPaginasi } from "@/components/toko/KomponenPaginasi";
import { IkonMangkuk } from "@/components/ikon/Ikon";
import type { KategoriMenu } from "@/generated/prisma/client";

const UKURAN_HALAMAN = 9;

interface HalamanMenuProps {
  searchParams: Promise<{ kategori?: string; halaman?: string }>;
}

export default async function HalamanMenu({ searchParams }: HalamanMenuProps) {
  const params = await searchParams;
  const filterKategori = params.kategori as KategoriMenu | undefined;

  const semuaMenu = await ambilMenuAktif(filterKategori);

  const totalHalaman = Math.max(1, Math.ceil(semuaMenu.length / UKURAN_HALAMAN));
  const halamanDiminta = Number(params.halaman ?? "1");
  const halamanAktif =
    Number.isFinite(halamanDiminta) && halamanDiminta >= 1
      ? Math.min(halamanDiminta, totalHalaman)
      : 1;
  const menuHalamanIni = semuaMenu.slice(
    (halamanAktif - 1) * UKURAN_HALAMAN,
    halamanAktif * UKURAN_HALAMAN
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Header Halaman */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <img
          src="/ilustrasi/lihat-menu.png"
          alt=""
          aria-hidden="true"
          width={216}
          height={231}
          className="h-28 w-auto mx-auto mb-1"
        />
        <span className="text-xs font-bold uppercase tracking-widest text-bata">
          Pilihan Hidangan Terbaik
        </span>
        <h1 className="font-tampil text-3xl md:text-4xl font-bold text-kayu">
          Daftar Menu Catering
        </h1>
        <p className="text-sm text-kayu-sedang">
          Semua hidangan dimasak higienis dengan bumbu rempah pilihan. Dibuat sesuai
          jadwal pesanan agar tiba hangat dan segar di meja acara Anda.
        </p>
      </div>

      {/* Filter Kategori Cepat (Horizontal, touchable >= 48px) */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-1">
        <Link
          href="/menu"
          className={`min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center ${
            !filterKategori
              ? "bg-bata text-white shadow-sm"
              : "bg-white text-kayu border border-krem-gelap hover:bg-krem-tua"
          }`}
        >
          Semua Kategori
        </Link>

        {URUTAN_KATEGORI.map((kat) => {
          const aktif = filterKategori === kat;
          return (
            <Link
              key={kat}
              href={`/menu?kategori=${kat}`}
              className={`min-h-[48px] px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors inline-flex items-center justify-center ${
                aktif
                  ? "bg-bata text-white shadow-sm"
                  : "bg-white text-kayu border border-krem-gelap hover:bg-krem-tua"
              }`}
            >
              {LABEL_KATEGORI[kat]}
            </Link>
          );
        })}
      </div>

      {/* Grid Menu */}
      {semuaMenu.length === 0 ? (
        <div className="bg-white rounded-2xl border border-krem-gelap p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-krem-tua text-kayu-sedang mx-auto flex items-center justify-center">
            <IkonMangkuk className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-kayu">Belum Ada Menu</h3>
          <p className="text-xs text-kayu-sedang leading-relaxed">
            Menu untuk kategori ini belum tersedia atau dapur sedang memperbarui
            katalog.
          </p>
          <Link
            href="/menu"
            className="min-h-[48px] px-6 py-2.5 rounded-xl font-semibold text-sm bg-krem-tua text-kayu hover:bg-krem-gelap inline-flex items-center justify-center"
          >
            Lihat Semua Menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuHalamanIni.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-2xl border border-krem-gelap hover:border-bata/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <Link href={`/menu/${item.slug}`} className="flex-1 flex flex-col">
                <PanelFotoMenu
                  fotoUrl={item.fotoUrl}
                  kategori={item.kategori}
                  nama={item.nama}
                  className="aspect-[4/3]"
                />

                <div className="p-6 space-y-4 flex-1">
                  {/* Lencana status dan kategori */}
                  <div className="flex items-center justify-between gap-2">
                    <LencanaKategori kategori={item.kategori} />
                    {item.preorderHari > 0 ? (
                      <span className="text-[11px] font-semibold text-kunyit-tua bg-kunyit-lembut px-2.5 py-0.5 rounded-md border border-kunyit/30">
                        Preorder {item.preorderHari} hari
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-daun-tua bg-daun-lembut px-2.5 py-0.5 rounded-md border border-daun/30">
                        Bisa Hari Ini
                      </span>
                    )}
                  </div>

                  {/* Judul & Deskripsi */}
                  <div>
                    <h2 className="text-lg font-bold text-kayu">{item.nama}</h2>
                    <p className="text-xs text-kayu-sedang mt-2 line-clamp-3 leading-relaxed">
                      {item.deskripsi}
                    </p>
                  </div>

                  {/* Harga dan ketentuan porsi */}
                  <div className="pt-4 border-t border-krem-gelap/60 flex items-end justify-between">
                    <div>
                      <span className="text-xs text-kayu-sedang block">
                        Harga / {item.satuan}
                      </span>
                      <span className="text-xl font-extrabold text-bata">
                        {rupiah(item.harga)}
                      </span>
                    </div>

                    <div className="text-right text-xs text-kayu-sedang">
                      <span className="block font-medium">
                        Min. {item.minPesan} {item.satuan}
                      </span>
                      {item.kapasitasHarian && (
                        <span className="text-[11px] text-kayu-sedang/80 block">
                          Maks {item.kapasitasHarian}/hari
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

              {/* Tombol Pesan */}
              <div className="p-6 pt-0">
                <Link
                  href={`/pesan?menu=${item.slug}`}
                  className="min-h-[48px] w-full py-2.5 rounded-xl font-semibold text-sm text-center text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Pesan Menu Ini</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <KomponenPaginasi
        halamanAktif={halamanAktif}
        totalHalaman={totalHalaman}
        basePath="/menu"
        queryLain={{ kategori: filterKategori }}
      />

      {/* Bantuan Custom Order */}
      <div className="bg-krem-tua rounded-2xl border border-krem-gelap p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-kayu">
            Ingin Mengubah Pilihan Lauk atau Request Khusus?
          </h3>
          <p className="text-xs text-kayu-sedang max-w-xl">
            Kami menerima pesanan katering dengan variasi lauk sesuai preferensi
            keluarga atau tamu kantor Anda.
          </p>
        </div>

        <Link
          href="/pesan"
          className="min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm bg-kayu text-white hover:bg-kayu-sedang transition-colors shrink-0 inline-flex items-center justify-center"
        >
          Formulir Pemesanan Lengkap
        </Link>
      </div>
    </div>
  );
}

