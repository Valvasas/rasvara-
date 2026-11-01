"use client";

import { IkonCetak } from "@/components/ikon/Ikon";

/** Mencetak halaman yang sedang dibuka (sidebar & tombol disembunyikan lewat .jangan-cetak). */
export function TombolCetakHalaman({ label = "Cetak" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="jangan-cetak tombol-kedua">
      <IkonCetak className="w-5 h-5" />
      {label}
    </button>
  );
}
