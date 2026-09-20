"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface FotoSorotan {
  id: string;
  fotoUrl: string;
  nama: string;
}

interface PanelSorotanProps {
  foto: FotoSorotan[];
}

/**
 * Showcase foto menu asli di bawah hero, cross-fade otomatis jika lebih dari
 * satu foto. Hanya dirender oleh pemanggil saat ada foto (fotoUrl != null);
 * dijaga null di sini juga untuk aman dipakai ulang.
 */
export function PanelSorotan({ foto }: PanelSorotanProps) {
  const [aktif, setAktif] = useState(0);

  useEffect(() => {
    if (foto.length <= 1) return;

    const kurangiGerak =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (kurangiGerak) return;

    const timer = setInterval(() => {
      setAktif((i) => (i + 1) % foto.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [foto.length]);

  if (foto.length === 0) return null;

  return (
    <div className="relative aspect-[16/9] rounded-3xl overflow-hidden shadow-xl border border-krem-gelap">
      {foto.map((f, idx) => (
        <Image
          key={f.id}
          src={f.fotoUrl}
          alt={f.nama}
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          priority={idx === 0}
          className={`object-cover transition-opacity duration-700 ease-in-out ${
            idx === aktif ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {foto.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
          {foto.map((f, idx) => (
            <span
              key={f.id}
              className={`h-1.5 rounded-full transition-all ${
                idx === aktif ? "w-6 bg-white" : "w-1.5 bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
