import Link from "next/link";
import { rupiah } from "@/lib/format";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";
import type { MenuDenganFoto } from "@/lib/menu";

interface KartuMenuProps {
  menu: MenuDenganFoto;
  prioritas?: boolean;
}

/**
 * Kartu menu untuk beranda & katalog. Hanya memuat yang dipakai pembeli untuk
 * memutuskan: foto, nama, harga per satuan, dan minimal pesan. Deskripsi
 * dipotong dua baris; rinciannya ada di halaman detail.
 *
 * Seluruh kartu bisa diklik (tautan judul direntangkan menutupi kartu), tetapi
 * tombol "Pesan" tetap tautan terpisah — bukan tautan bersarang, yang tidak sah
 * di HTML dan membingungkan pembaca layar.
 */
export function KartuMenu({ menu, prioritas = false }: KartuMenuProps) {
  return (
    <article className="group relative flex sm:flex-col rounded-2xl bg-white border border-krem-gelap overflow-hidden transition-shadow hover:shadow-[var(--shadow-angkat)]">
      <PanelFotoMenu
        foto={menu.foto}
        kategori={menu.kategori}
        nama={menu.nama}
        priority={prioritas}
        className="w-28 shrink-0 aspect-square sm:w-auto sm:aspect-[4/3]"
        ukuranIkon="w-8 h-8 sm:w-12 sm:h-12"
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 112px"
      />

      {menu.preorderHari > 0 && (
        <span className="absolute top-2 left-2 sm:top-3 sm:left-3 lencana bg-white/95 text-kayu border-transparent">
          Pesan H-{menu.preorderHari}
        </span>
      )}

      <div className="flex flex-1 min-w-0 flex-col p-3 sm:p-5">
        <h3 className="font-semibold text-kayu leading-snug">
          <Link
            href={`/menu/${menu.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-bata focus-visible:after:rounded-2xl"
          >
            {menu.nama}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-kayu-sedang line-clamp-1 sm:line-clamp-2">{menu.deskripsi}</p>

        <div className="mt-auto pt-2 sm:pt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-semibold text-kayu angka-tabel">
              {rupiah(menu.harga)}
              <span className="text-sm font-normal text-kayu-sedang"> / {menu.satuan}</span>
            </p>
            <p className="text-xs text-kayu-sedang mt-0.5">
              Min. {menu.minPesan} {menu.satuan}
            </p>
          </div>
          <Link
            href={`/pesan?menu=${menu.slug}`}
            className="relative z-10 tombol-kedua tombol-kecil group-hover:border-bata/40 group-hover:text-bata"
            aria-label={`Pesan ${menu.nama}`}
          >
            Pesan
          </Link>
        </div>
      </div>
    </article>
  );
}
