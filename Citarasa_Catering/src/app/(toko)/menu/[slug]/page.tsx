import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ambilMenuBerdasarkanSlug } from "@/lib/menu";
import { rupiah } from "@/lib/format";
import { LABEL_KATEGORI } from "@/lib/pesanan";
import { GaleriFotoMenu } from "@/components/toko/GaleriFotoMenu";
import { IkonKalender, IkonPanahKiri } from "@/components/ikon/Ikon";
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

  await catatPeristiwa("MENU_DILIHAT");

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href={`/menu?kategori=${menu.kategori}`}
        className="inline-flex items-center gap-1.5 text-sm text-kayu-sedang hover:text-kayu"
      >
        <IkonPanahKiri className="w-4 h-4" />
        {LABEL_KATEGORI[menu.kategori]}
      </Link>

      <div className="mt-5 grid gap-8 lg:gap-12 lg:grid-cols-[1.15fr_1fr] items-start">
        <GaleriFotoMenu
          foto={menu.foto.map((f) => ({ id: f.id, url: f.url, keterangan: f.keterangan }))}
          nama={menu.nama}
          kategori={menu.kategori}
        />

        <div className="lg:sticky lg:top-24">
          <h1 className="font-tampil text-3xl sm:text-4xl font-bold text-kayu leading-tight">
            {menu.nama}
          </h1>

          <p className="mt-4 text-2xl font-semibold text-kayu angka-tabel">
            {rupiah(menu.harga)}
            <span className="text-base font-normal text-kayu-sedang"> / {menu.satuan}</span>
          </p>

          <p className="mt-5 text-kayu-sedang leading-relaxed whitespace-pre-line">{menu.deskripsi}</p>

          <dl className="mt-6 divide-y divide-krem-gelap border-y border-krem-gelap text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-kayu-sedang">Minimal pesan</dt>
              <dd className="font-medium text-kayu">
                {menu.minPesan} {menu.satuan}
              </dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-kayu-sedang">Waktu pesan</dt>
              <dd className="font-medium text-kayu">
                {menu.preorderHari > 0 ? `Paling lambat H-${menu.preorderHari}` : "Bisa untuk hari ini"}
              </dd>
            </div>
          </dl>

          <Link href={`/pesan?menu=${menu.slug}`} className="tombol-utama tombol-besar w-full mt-6">
            Pesan menu ini
          </Link>

          {menu.preorderHari > 0 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-kayu-sedang">
              <IkonKalender className="w-4 h-4 shrink-0" />
              Menu ini dimasak khusus, jadi tanggal acara paling cepat {menu.preorderHari} hari dari
              sekarang.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
