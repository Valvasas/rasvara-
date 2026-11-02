import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import {
  ambilHalamanMenu,
  ambilMenuBerdasarkanSlug,
  ambilPetaTerjual,
  dataKeranjangDariMenu,
} from "@/lib/menu";
import { labelTerjual, linkWhatsapp, rupiah } from "@/lib/format";
import { ambilPengaturan } from "@/lib/pengaturan";
import { LABEL_KATEGORI } from "@/lib/pesanan";
import { GaleriFotoMenu } from "@/components/toko/GaleriFotoMenu";
import { KartuMenu } from "@/components/toko/KartuMenu";
import { Muncul } from "@/components/Muncul";
import { PembelianMenu } from "@/components/toko/PembelianMenu";
import { IkonApi, IkonCek, IkonKalender, IkonPanahKiri, IkonTruk } from "@/components/ikon/Ikon";
import { catatPeristiwa } from "@/lib/analitik";

interface HalamanDetailMenuProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HalamanDetailMenuProps): Promise<Metadata> {
  const { slug } = await params;
  const menu = await ambilMenuBerdasarkanSlug(slug);
  if (!menu) return { title: "Menu tidak ditemukan" };
  return {
    title: menu.nama,
    description: `${menu.nama} — ${rupiah(menu.harga)} per ${menu.satuan}. ${menu.deskripsi}`.slice(0, 160),
  };
}

export default async function HalamanDetailMenu({ params }: HalamanDetailMenuProps) {
  const { slug } = await params;
  const menu = await ambilMenuBerdasarkanSlug(slug);

  if (!menu) {
    notFound();
  }

  const [pengaturan, terjual, sekategori] = await Promise.all([
    ambilPengaturan(),
    ambilPetaTerjual(),
    ambilHalamanMenu({ kategori: menu.kategori, halaman: 1, ukuran: 5 }),
    catatPeristiwa("MENU_DILIHAT"),
  ]);

  const labelLaku = labelTerjual(terjual.get(menu.id) ?? 0);
  const lainnya = sekategori.daftar.filter((m) => m.id !== menu.id).slice(0, 4);
  const waUrl = pengaturan.whatsapp
    ? linkWhatsapp(pengaturan.whatsapp, `Halo ${pengaturan.namaUsaha}, saya mau tanya soal menu "${menu.nama}".`)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 pb-10 sm:pt-8 sm:pb-14">
      <nav aria-label="Jejak halaman" className="flex items-center gap-1.5 text-[14px] text-arang-sedang">
        <Link href="/menu" className="inline-flex items-center gap-1 min-h-[40px] hover:text-arang">
          <IkonPanahKiri className="w-4 h-4" />
          Menu
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/menu?kategori=${menu.kategori}`} className="min-h-[40px] inline-flex items-center hover:text-arang">
          {LABEL_KATEGORI[menu.kategori]}
        </Link>
      </nav>

      <div className="mt-2 grid gap-6 lg:gap-12 lg:grid-cols-[1.1fr_1fr] items-start">
        <ViewTransition name={`foto-${menu.id}`} share="foto-menu" default="none">
          <div>
            <GaleriFotoMenu
              foto={menu.foto.map((f) => ({ id: f.id, url: f.url, keterangan: f.keterangan }))}
              nama={menu.nama}
              kategori={menu.kategori}
            />
          </div>
        </ViewTransition>

        <div className="lg:sticky lg:top-24">
          <h1 className="font-tampil text-[1.75rem] sm:text-4xl font-bold text-arang leading-tight">{menu.nama}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {labelLaku && (
              <span className="lencana bg-pandan-lembut text-pandan-tua border-pandan/20">
                <IkonApi className="w-3.5 h-3.5" />
                {labelLaku}
              </span>
            )}
            <span className="lencana bg-arang-lembut text-arang border-arang/10">{LABEL_KATEGORI[menu.kategori]}</span>
          </div>

          <p className="mt-4 text-3xl font-bold text-pandan-tua angka-tabel">
            {rupiah(menu.harga)}
            <span className="text-base font-medium text-arang-sedang"> / {menu.satuan}</span>
          </p>

          <p className="mt-4 text-[17px] text-arang-sedang leading-relaxed whitespace-pre-line">{menu.deskripsi}</p>

          <ul className="mt-5 grid gap-2.5 text-[15px]">
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-kunyit-lembut text-kunyit-tua flex items-center justify-center">
                <IkonKalender className="w-[18px] h-[18px]" />
              </span>
              <span className="pt-1">
                {menu.preorderHari > 0 ? (
                  <>
                    Pesan paling lambat <strong className="text-arang">H-{menu.preorderHari}</strong> — dimasak khusus untukmu
                  </>
                ) : (
                  <>Bisa dipesan <strong className="text-arang">untuk hari ini</strong></>
                )}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-pandan-lembut text-pandan-tua flex items-center justify-center">
                <IkonCek className="w-[18px] h-[18px]" />
              </span>
              <span className="pt-1">
                Minimal pesan <strong className="text-arang">{menu.minPesan} {menu.satuan}</strong>, bisa digabung menu lain
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 shrink-0 rounded-lg bg-pandan-lembut text-pandan-tua flex items-center justify-center">
                <IkonTruk className="w-[18px] h-[18px]" />
              </span>
              <span className="pt-1">
                {pengaturan.ongkirDefault === 0
                  ? "Diantar gratis atau ambil sendiri"
                  : pengaturan.minOrderAntar > 0
                  ? `Gratis ongkir untuk belanja min. ${rupiah(pengaturan.minOrderAntar)}`
                  : `Diantar (ongkir ${rupiah(pengaturan.ongkirDefault)}) atau ambil sendiri`}
              </span>
            </li>
          </ul>

          <PembelianMenu menu={dataKeranjangDariMenu(menu)} waUrl={waUrl} />
        </div>
      </div>

      {lainnya.length > 0 && (
        <section aria-labelledby="judul-lainnya" className="mt-12 sm:mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 id="judul-lainnya" className="judul-bagian">
              {LABEL_KATEGORI[menu.kategori]} lainnya
            </h2>
            <Link
              href={`/menu?kategori=${menu.kategori}`}
              className="shrink-0 min-h-[44px] inline-flex items-center text-[15px] font-semibold text-pandan hover:text-pandan-tua"
            >
              Lihat semua
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {lainnya.map((m) => (
              <Muncul key={m.id}>
                <KartuMenu menu={m} terjual={terjual.get(m.id) ?? 0} />
              </Muncul>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
