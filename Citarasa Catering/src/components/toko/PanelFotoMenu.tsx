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
  NASI_KOTAK: { latar: "bg-bata-lembut", ikonWarna: "text-bata-tua/70", Ikon: IkonKotakNasi },
  SNACK: { latar: "bg-kunyit-lembut", ikonWarna: "text-kunyit-tua/70", Ikon: IkonSnack },
  TUMPENG: { latar: "bg-daun-lembut", ikonWarna: "text-daun-tua/70", Ikon: IkonTumpeng },
  NASI_GORENG: { latar: "bg-kayu-lembut", ikonWarna: "text-kayu-sedang/70", Ikon: IkonNasiGoreng },
};

interface PanelFotoMenuProps {
  fotoUrl: string | null;
  kategori: KategoriMenu;
  nama: string;
  className?: string;
  ukuranIkon?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Panel foto menu dengan fallback ikon-per-kategori saat `fotoUrl` kosong
 * (kondisi bawaan saat ini karena admin belum bisa unggah foto menu).
 * Satu sumber kebenaran dipakai di kartu Beranda, kartu /menu, dan halaman
 * detail supaya begitu foto asli tersedia, semua tempat otomatis terupdate.
 */
export function PanelFotoMenu({
  fotoUrl,
  kategori,
  nama,
  className = "",
  ukuranIkon = "w-10 h-10",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: PanelFotoMenuProps) {
  const gaya = GAYA_KATEGORI[kategori];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {fotoUrl ? (
        <Image
          src={fotoUrl}
          alt={nama}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${gaya.latar}`}>
          <gaya.Ikon className={`${ukuranIkon} ${gaya.ikonWarna}`} strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
}
