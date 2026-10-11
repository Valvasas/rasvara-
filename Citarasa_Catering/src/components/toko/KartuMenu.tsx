import Link from "next/link";
import { rupiah } from "@/lib/format";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";
import { IkonTambah } from "@/components/ikon/Ikon";
import type { MenuDenganFoto } from "@/lib/menu";

interface KartuMenuProps {
  menu: MenuDenganFoto;
  prioritas?: boolean;
}

/**
 * Kartu menu untuk beranda & katalog. Hanya memuat yang dipakai pembeli untuk
 * memutuskan: foto, nama, harga per satuan, minimal pesan, dan kapan paling
 * cepat bisa dipesan (lencana di pojok gambar). Deskripsi dipotong; rinciannya
 * ada di halaman detail.
 *
 * Seluruh kartu bisa diklik (tautan judul direntangkan menutupi kartu), tetapi
 * tombol "Pesan" tetap tautan terpisah — bukan tautan bersarang, yang tidak sah
 * di HTML dan membingungkan pembaca layar.
 *
 * Di ponsel kartu dibuat mendatar (gambar kiri, teks kanan) supaya satu layar
 * memuat 4–5 menu, bukan 1,5 menu raksasa yang harus terus digulir.
 */
export function KartuMenu({ menu, prioritas = false }: KartuMenuProps) {
  return (
    <article className="group relative flex sm:flex-col rounded-2xl bg-white border border-krem-gelap overflow-hidden transition-[box-shadow,transform,border-color] duration-300 hover:shadow-[var(--shadow-angkat)] hover:border-bata/25 sm:hover:-translate-y-0.5">
      <PanelFotoMenu
        foto={menu.foto}
        kategori={menu.kategori}
        nama={menu.nama}
        priority={prioritas}
        className="w-28 shrink-0 self-stretch min-h-28 sm:min-h-0 sm:w-auto sm:aspect-[4/3]"
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 112px"
      />

      {/* Kapan paling cepat bisa dipesan — penentu utama bagi pembeli catering. */}
      <span
        className={`absolute top-2 left-2 sm:top-3 sm:left-3 lencana border-transparent shadow-sm text-[11px] sm:text-xs px-2 sm:px-2.5 ${
          menu.preorderHari > 0 ? "bg-white/95 text-kayu" : "bg-daun-lembut/95 text-daun-tua"
        }`}
      >
        {menu.preorderHari > 0 ? `Pesan H-${menu.preorderHari}` : "Bisa hari ini"}
      </span>

      <div className="flex flex-1 min-w-0 flex-col p-3 sm:p-5">
        <h3 className="font-semibold text-kayu leading-snug break-words">
          <Link
            href={`/menu/${menu.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-bata focus-visible:after:rounded-2xl"
          >
            {menu.nama}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-kayu-sedang line-clamp-1 sm:line-clamp-2">{menu.deskripsi}</p>

        {/* flex-wrap: di HP 320px kolom teks hanya ±150px; tombol "Pesan" turun
            ke bawah harga alih-alih harga dipatah menjadi "Rp15.0 / 00". */}
        <div className="mt-auto pt-2 sm:pt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="font-semibold text-kayu angka-tabel whitespace-nowrap">{rupiah(menu.harga)}</p>
            {/* Satuan ditaruh di baris kecil, bukan di sebelah harga: di kartu
                sempit "Rp28.000 /" lalu "kotak" patah ke baris baru. */}
            <p className="text-xs text-kayu-sedang mt-0.5">
              per {menu.satuan} · min. {menu.minPesan}
            </p>
          </div>
          <Link
            href={`/pesan?menu=${menu.slug}`}
            className="relative z-10 tombol-kedua tombol-kecil shrink-0 gap-1 bg-bata-lembut text-bata-tua border-transparent hover:bg-bata hover:text-white hover:border-transparent"
            aria-label={`Pesan ${menu.nama}`}
          >
            <IkonTambah className="w-3.5 h-3.5" strokeWidth={2.25} />
            Pesan
          </Link>
        </div>
      </div>
    </article>
  );
}
