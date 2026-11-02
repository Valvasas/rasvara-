"use client";

import { useEffect, useState } from "react";
import { jam } from "@/lib/format";

/**
 * Jam WIB yang berdetak di beranda dapur. Dapur bekerja dengan jam acara,
 * jadi "sekarang pukul berapa" harus terlihat tanpa melirik HP lain.
 * Render pertama memakai nilai dari server (HTML server = klien), lalu
 * diperbarui tiap 15 detik.
 */
export function JamLangsung({ awal, className = "" }: { awal: string; className?: string }) {
  const [sekarang, setSekarang] = useState(awal);
  useEffect(() => {
    const perbarui = () => setSekarang(jam(new Date()));
    perbarui();
    const id = window.setInterval(perbarui, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time suppressHydrationWarning className={`font-presisi tabular-nums ${className}`}>
      {sekarang}
    </time>
  );
}
