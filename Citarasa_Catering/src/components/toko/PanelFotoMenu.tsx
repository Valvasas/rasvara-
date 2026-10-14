import Image from "next/image";
import type { KategoriMenu } from "@/generated/prisma/client";
import { IlustrasiKategori, LATAR_KATEGORI } from "@/components/ilustrasi/Ilustrasi";

interface PanelFotoMenuProps {
  /** Galeri menu, sudah urut. Foto pertama dipakai sebagai sampul. */
  foto: { url: string }[];
  kategori: KategoriMenu;
  nama: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Tulis label kecil "Ilustrasi" di atas gambar pengganti (dipakai di halaman detail). */
  tandaiIlustrasi?: boolean;
}

/**
 * Sampul menu dengan ilustrasi hidangan per kategori saat galerinya masih
 * kosong. Satu sumber kebenaran dipakai di kartu Beranda, kartu /menu, dan
 * halaman detail supaya begitu foto asli diunggah, semua tempat otomatis ikut
 * berubah.
 *
 * Ilustrasi jelas bergaya gambar (bukan foto), jadi tidak menjanjikan tampilan
 * hidangan yang persis; di halaman detail labelnya ditulis terang-terangan.
 */
export function PanelFotoMenu({
  foto,
  kategori,
  nama,
  className = "",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  tandaiIlustrasi = false,
}: PanelFotoMenuProps) {
  const sampul = foto[0];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {sampul ? (
        <>
          <Image
            src={sampul.url}
            alt={nama}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {foto.length > 1 && (
            <span className="absolute bottom-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-kayu">
              {foto.length} foto
            </span>
          )}
        </>
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center latar-kawung-tipis ${LATAR_KATEGORI[kategori]}`}>
          <IlustrasiKategori
            kategori={kategori}
            className="w-[88%] h-[88%] transition-transform duration-500 group-hover:scale-[1.04] group-hover:-rotate-1"
          />
          {tandaiIlustrasi && (
            <span className="absolute bottom-3 left-3 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/90 text-kayu-sedang">
              Ilustrasi · foto asli menyusul
            </span>
          )}
        </div>
      )}
    </div>
  );
}
