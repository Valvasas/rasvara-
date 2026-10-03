"use client";

import { IkonCetak } from "@/components/ikon/Ikon";

export function TombolCetakHalaman({ label = "Cetak" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="tombol-kedua jangan-cetak">
      <IkonCetak className="w-4 h-4" /> {label}
    </button>
  );
}
