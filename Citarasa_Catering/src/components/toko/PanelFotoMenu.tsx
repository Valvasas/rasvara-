import Image from "next/image";
import type { KategoriMenu } from "@/generated/prisma/client";
import {
  IkonKotakNasi,
  IkonNasiGoreng,
  IkonSnack,
  IkonTumpeng,
} from "@/components/ikon/Ikon";

const GAYA_KATEGORI: Record<
  KategoriMenu,
  { latar: string; ikonWarna: string; Ikon: typeof IkonKotakNasi }
> = {
  // Satu keluarga warna hangat yang sama, hanya beda nada tipis per kategori,
  // supaya grid menu tanpa foto tidak terlihat seperti papan permen warna-warni.
  NASI_KOTAK: { latar: "bg-[#F6E7DC]", ikonWarna: "text-bata/45", Ikon: IkonKotakNasi },
  SNACK: { latar: "bg-[#F8EDD8]", ikonWarna: "text-kunyit-tua/45", Ikon: IkonSnack },
  TUMPENG: { latar: "bg-[#F4EAD6]", ikonWarna: "text-kunyit-tua/45", Ikon: IkonTumpeng },
  NASI_GORENG: { latar: "bg-[#F3E4DA]", ikonWarna: "text-bata-tua/40", Ikon: IkonNasiGoreng },
};

interface PanelFotoMenuProps {
  /** Galeri menu, sudah urut. Foto pertama dipakai sebagai sampul. */
  foto: { url: string }[];
  kategori: KategoriMenu;
  nama: string;
  className?: string;
  ukuranIkon?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Sampul menu dengan fallback ikon-per-kategori saat galerinya masih kosong.
 * Satu sumber kebenaran dipakai di kartu Beranda, kartu /menu, dan halaman
 * detail supaya begitu foto asli diunggah, semua tempat otomatis ikut berubah.
 */
export function PanelFotoMenu({
  foto,
  kategori,
  nama,
  className = "",
  ukuranIkon = "w-10 h-10",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: PanelFotoMenuProps) {
  const gaya = GAYA_KATEGORI[kategori];
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
            className="object-cover"
          />
          {foto.length > 1 && (
            <span className="absolute bottom-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-kayu">
              {foto.length} foto
            </span>
          )}
        </>
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${gaya.latar}`}>
          <gaya.Ikon className={`${ukuranIkon} ${gaya.ikonWarna}`} strokeWidth={1.1} />
        </div>
      )}
    </div>
  );
}
