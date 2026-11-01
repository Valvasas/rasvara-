import Link from "next/link";
import { ViewTransition } from "react";
import { labelTerjual, rupiah } from "@/lib/format";
import { dataKeranjangDariMenu, type MenuDenganFoto } from "@/lib/menu";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";
import { TombolTambahKeranjang } from "@/components/toko/TombolTambahKeranjang";
import { IkonApi, IkonKalender } from "@/components/ikon/Ikon";

interface KartuMenuProps {
  menu: MenuDenganFoto;
  prioritas?: boolean;
  terjual?: number;
  /** Peringkat terlaris (1 = paling laris) untuk lencana di pojok foto. */
  peringkat?: number;
}

/**
 * Kartu menu bergaya marketplace: foto persegi, nama dua baris, harga tebal
 * berwarna, bukti sosial "terjual", dan tombol tambah langsung di kartu.
 * Di ponsel tampil dua kolom (pola Shopee/Tokopedia) supaya lebih banyak
 * pilihan terlihat sekaligus tanpa menggulir jauh.
 *
 * Seluruh kartu bisa diklik (tautan judul direntangkan menutupi kartu), tetapi
 * tombol tambah berada di atasnya (z-10) — bukan tautan bersarang, yang tidak
 * sah di HTML dan membingungkan pembaca layar.
 */
export function KartuMenu({ menu, prioritas = false, terjual = 0, peringkat }: KartuMenuProps) {
  const label = labelTerjual(terjual);
  return (
    <article className="group relative flex flex-col h-full rounded-2xl bg-white border border-krem-gelap overflow-hidden kartu-interaktif">
      <ViewTransition name={`foto-${menu.id}`} share="foto-menu" default="none">
        <PanelFotoMenu
          foto={menu.foto}
          kategori={menu.kategori}
          nama={menu.nama}
          priority={prioritas}
          className="aspect-square sm:aspect-[4/3] w-full"
          ukuranIkon="w-12 h-12"
          sizes="(min-width: 1280px) 280px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw"
          zoomSaatHover
        />
      </ViewTransition>

      <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
        {menu.preorderHari > 0 ? (
          <span className="lencana bg-white/95 text-kayu border-transparent shadow-sm text-[12px] sm:text-[13px]">
            <IkonKalender className="w-3.5 h-3.5" />
            H-{menu.preorderHari}
          </span>
        ) : (
          <span />
        )}
        {peringkat !== undefined && peringkat <= 3 && (
          <span className="lencana bg-bata text-white border-transparent shadow-sm text-[12px] sm:text-[13px]">
            <IkonApi className="w-3.5 h-3.5" />
            #{peringkat}
          </span>
        )}
      </div>

      <div className="flex flex-1 min-w-0 flex-col p-3 sm:p-4">
        <h3 className="text-[15px] sm:text-base font-semibold text-kayu leading-snug line-clamp-2 min-h-[2.6em]">
          <Link
            href={`/menu/${menu.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-4 focus-visible:after:ring-bata/40 focus-visible:after:rounded-2xl"
          >
            {menu.nama}
          </Link>
        </h3>

        <p className="mt-1.5 text-lg font-bold text-bata-tua angka-tabel leading-none">
          {rupiah(menu.harga)}
          <span className="text-[13px] font-medium text-kayu-sedang"> /{menu.satuan}</span>
        </p>

        <p className="mt-1.5 text-[13px] text-kayu-sedang leading-snug">
          Min. {menu.minPesan}
          {label && (
            <>
              <span aria-hidden="true"> · </span>
              {label}
            </>
          )}
        </p>

        <div className="mt-auto pt-3">
          <TombolTambahKeranjang menu={dataKeranjangDariMenu(menu)} lebar />
        </div>
      </div>
    </article>
  );
}
