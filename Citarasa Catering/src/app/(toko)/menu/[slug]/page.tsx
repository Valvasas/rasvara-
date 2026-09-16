import Link from "next/link";
import { notFound } from "next/navigation";
import { ambilMenuBerdasarkanSlug } from "@/lib/menu";
import { rupiah } from "@/lib/format";
import { LABEL_KATEGORI } from "@/lib/pesanan";
import { LencanaKategori } from "@/components/Lencana";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";
import { GaleriFotoMenu } from "@/components/toko/GaleriFotoMenu";
import { catatPeristiwa } from "@/lib/analitik";

interface HalamanDetailMenuProps {
  params: Promise<{ slug: string }>;
}

export default async function HalamanDetailMenu({ params }: HalamanDetailMenuProps) {
  const { slug } = await params;
  const menu = await ambilMenuBerdasarkanSlug(slug);

  if (!menu) {
    notFound();
  }

  await catatPeristiwa("MENU_DILIHAT");

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="text-xs text-kayu-sedang flex items-center gap-1.5">
        <Link href="/menu" className="hover:text-bata font-medium">
          Daftar Menu
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/menu?kategori=${menu.kategori}`} className="hover:text-bata font-medium">
          {LABEL_KATEGORI[menu.kategori]}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-kayu font-semibold">{menu.nama}</span>
      </div>

      <div className="permukaan-kartu rounded-3xl overflow-hidden">
        {menu.foto.length > 0 ? (
          <GaleriFotoMenu
            foto={menu.foto.map((f) => ({
              id: f.id,
              url: f.url,
              keterangan: f.keterangan,
            }))}
            nama={menu.nama}
            kategori={menu.kategori}
          />
        ) : (
          <PanelFotoMenu
            foto={[]}
            kategori={menu.kategori}
            nama={menu.nama}
            className="aspect-[16/9]"
            ukuranIkon="w-16 h-16"
            priority
          />
        )}

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-2">
            <LencanaKategori kategori={menu.kategori} />
            {menu.preorderHari > 0 ? (
              <span className="text-[11px] font-semibold text-kunyit-tua bg-kunyit-lembut px-2.5 py-0.5 rounded-md border border-kunyit/30">
                Preorder {menu.preorderHari} hari
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-daun-tua bg-daun-lembut px-2.5 py-0.5 rounded-md border border-daun/30">
                Bisa Hari Ini
              </span>
            )}
          </div>

          <div>
            <h1 className="font-tampil text-2xl sm:text-3xl font-bold text-kayu">
              {menu.nama}
            </h1>
            <p className="text-sm text-kayu-sedang mt-3 leading-relaxed">
              {menu.deskripsi}
            </p>
          </div>

          {/* Rincian Pesanan */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-krem/40 rounded-2xl border border-krem-gelap">
              <span className="text-xs font-bold text-kayu-sedang uppercase block mb-1">
                Harga
              </span>
              <p className="font-extrabold text-bata text-lg">{rupiah(menu.harga)}</p>
              <p className="text-xs text-kayu-sedang">per {menu.satuan}</p>
            </div>

            <div className="p-4 bg-krem/40 rounded-2xl border border-krem-gelap">
              <span className="text-xs font-bold text-kayu-sedang uppercase block mb-1">
                Minimal Pesan
              </span>
              <p className="font-bold text-kayu text-lg">
                {menu.minPesan} {menu.satuan}
              </p>
            </div>

            {menu.kapasitasHarian && (
              <div className="p-4 bg-krem/40 rounded-2xl border border-krem-gelap">
                <span className="text-xs font-bold text-kayu-sedang uppercase block mb-1">
                  Kapasitas Harian
                </span>
                <p className="font-bold text-kayu text-lg">{menu.kapasitasHarian}</p>
                <p className="text-xs text-kayu-sedang">{menu.satuan}/hari</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA pemesanan */}
      <div className="permukaan-kartu rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs text-kayu-sedang block">Harga per {menu.satuan}</span>
          <span className="text-lg font-extrabold text-bata">{rupiah(menu.harga)}</span>
        </div>
        <Link
          href={`/pesan?menu=${menu.slug}`}
          className="min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center justify-center gap-2 shadow-sm shrink-0"
        >
          <span>Pesan Menu Ini</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
