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
  { latar: string; ikonWarna: string; dial: string; Ikon: typeof IkonKotakNasi }
> = {
  // Satu warna merek per kategori — sama dengan ubin kategori di beranda,
  // jadi pembeli belajar "hijau = nasi kotak, emas = tumpeng" tanpa sadar.
  NASI_KOTAK: { latar: "bg-pandan-lembut", ikonWarna: "text-pandan", dial: "text-pandan", Ikon: IkonKotakNasi },
  SNACK: { latar: "bg-arang-lembut", ikonWarna: "text-arang-sedang", dial: "text-arang-sedang", Ikon: IkonSnack },
  TUMPENG: { latar: "bg-kunyit-lembut", ikonWarna: "text-kunyit-tua", dial: "text-kunyit", Ikon: IkonTumpeng },
  NASI_GORENG: { latar: "bg-cabai-lembut", ikonWarna: "text-cabai-tua", dial: "text-cabai", Ikon: IkonNasiGoreng },
};

/** 60 tick seperti piringan jam — motif "presisi" merek di sampul tanpa foto. */
function Dial({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      {Array.from({ length: 60 }, (_, i) => {
        const besar = i % 5 === 0;
        return (
          <line
            key={i}
            x1="50"
            y1={besar ? 4 : 5.5}
            x2="50"
            y2={besar ? 11 : 8.5}
            stroke="currentColor"
            strokeWidth={besar ? 1.4 : 0.7}
            strokeLinecap="round"
            opacity={besar ? 0.55 : 0.3}
            transform={`rotate(${i * 6} 50 50)`}
          />
        );
      })}
      <circle cx="50" cy="50" r="33" fill="white" opacity="0.65" />
    </svg>
  );
}

interface PanelFotoMenuProps {
  /** Galeri menu, sudah urut. Foto pertama dipakai sebagai sampul. */
  foto: { url: string }[];
  kategori: KategoriMenu;
  nama: string;
  className?: string;
  ukuranIkon?: string;
  sizes?: string;
  priority?: boolean;
  /** Foto sedikit membesar saat kartu induknya (kelas `group`) disorot. */
  zoomSaatHover?: boolean;
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
  zoomSaatHover = false,
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
            className={`object-cover ${zoomSaatHover ? "transition-transform duration-500 ease-out group-hover:scale-105" : ""}`}
          />
          {foto.length > 1 && (
            <span className="absolute bottom-2 right-2 font-presisi text-[11.5px] font-semibold px-2 py-0.5 rounded-md bg-white/90 text-arang">
              {foto.length} foto
            </span>
          )}
        </>
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center permukaan-hangat ${gaya.latar}`}>
          <Dial
            className={`absolute h-[78%] max-h-64 aspect-square ${gaya.dial} ${zoomSaatHover ? "transition-transform duration-700 ease-out group-hover:rotate-[30deg]" : ""}`}
          />
          <gaya.Ikon
            className={`relative ${ukuranIkon} ${gaya.ikonWarna} ${zoomSaatHover ? "transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" : ""}`}
            strokeWidth={1.3}
          />
        </div>
      )}
    </div>
  );
}
