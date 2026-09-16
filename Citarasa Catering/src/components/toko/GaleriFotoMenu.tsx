"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { KategoriMenu } from "@/generated/prisma/client";
import { PanelFotoMenu } from "@/components/toko/PanelFotoMenu";

export interface FotoGaleri {
  id: string;
  url: string;
  keterangan: string | null;
}

interface GaleriFotoMenuProps {
  foto: FotoGaleri[];
  nama: string;
  kategori: KategoriMenu;
}

/**
 * Galeri foto menu bergaya e-commerce.
 *
 * Geseran memakai CSS scroll-snap bawaan browser, bukan pustaka carousel:
 * gerakan jari di HP terasa native, tetap bisa di-scroll dengan keyboard, dan
 * tidak menambah beban JavaScript untuk pembeli yang mayoritas memakai data
 * seluler. Tidak ada putar-otomatis — foto makanan perlu dibaca dengan tenang,
 * dan slide yang bergerak sendiri merampas kendali pembaca layar.
 */
export function GaleriFotoMenu({ foto, nama, kategori }: GaleriFotoMenuProps) {
  const trekRef = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);

  const keFoto = useCallback((index: number) => {
    const trek = trekRef.current;
    if (!trek) return;
    const anak = trek.children[index] as HTMLElement | undefined;
    if (anak) {
      trek.scrollTo({ left: anak.offsetLeft, behavior: "smooth" });
    }
  }, []);

  const saatGeser = useCallback(() => {
    const trek = trekRef.current;
    if (!trek) return;
    const lebar = trek.clientWidth;
    if (lebar === 0) return;
    const index = Math.round(trek.scrollLeft / lebar);
    setAktif((lama) => (lama === index ? lama : index));
  }, []);

  // Tanpa foto: pakai panel ikon kategori yang sudah dipakai di seluruh katalog.
  if (foto.length === 0) {
    return (
      <PanelFotoMenu
        foto={[]}
        kategori={kategori}
        nama={nama}
        className="aspect-[4/3] w-full rounded-3xl border border-krem-gelap"
        ukuranIkon="w-20 h-20"
        priority
      />
    );
  }

  const tunggal = foto.length === 1;

  return (
    <div className="space-y-3">
      <div
        className="relative group"
        role="group"
        aria-roledescription="galeri foto"
        aria-label={`Foto ${nama}`}
      >
        <div
          ref={trekRef}
          onScroll={saatGeser}
          tabIndex={0}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-3xl border border-krem-gelap bg-krem/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-bata/30"
          style={{ scrollbarWidth: "none" }}
        >
          {foto.map((f, i) => (
            <div
              key={f.id}
              className="relative w-full flex-shrink-0 snap-center aspect-[4/3]"
              role="group"
              aria-roledescription="slide"
              aria-label={`Foto ${i + 1} dari ${foto.length}`}
            >
              <Image
                src={f.url}
                alt={f.keterangan?.trim() || `${nama} — foto ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority={i === 0}
                className="object-cover"
              />
              {f.keterangan && (
                <p className="absolute bottom-0 inset-x-0 bg-kayu/80 text-krem text-xs font-medium px-4 py-2">
                  {f.keterangan}
                </p>
              )}
            </div>
          ))}
        </div>

        {!tunggal && (
          <>
            <button
              type="button"
              onClick={() => keFoto(Math.max(0, aktif - 1))}
              disabled={aktif === 0}
              aria-label="Lihat foto sebelumnya"
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-krem/95 text-kayu shadow-md border border-krem-gelap hover:bg-white disabled:opacity-0 transition-all cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => keFoto(Math.min(foto.length - 1, aktif + 1))}
              disabled={aktif === foto.length - 1}
              aria-label="Lihat foto berikutnya"
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-krem/95 text-kayu shadow-md border border-krem-gelap hover:bg-white disabled:opacity-0 transition-all cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-kayu/80 text-krem">
              {aktif + 1} / {foto.length}
            </span>
          </>
        )}
      </div>

      {!tunggal && (
        <ul className="flex items-center gap-2 justify-center sm:justify-start">
          {foto.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => keFoto(i)}
                aria-label={`Lihat foto ${i + 1}`}
                aria-current={i === aktif}
                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  i === aktif
                    ? "border-bata ring-2 ring-bata/20"
                    : "border-krem-gelap opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={f.url}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
