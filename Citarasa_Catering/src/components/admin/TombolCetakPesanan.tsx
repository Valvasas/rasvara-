"use client";

import Link from "next/link";

interface TombolCetakPesananProps {
  kode: string;
  ringkas?: boolean;
}

export function TombolCetakPesanan({ kode, ringkas = false }: TombolCetakPesananProps) {
  return (
    <Link
      href={`/admin/pesanan/${kode}/cetak`}
      target="_blank"
      rel="noopener noreferrer"
      className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer border ${
        ringkas
          ? "px-3 py-1.5 bg-white text-kayu border-krem-gelap hover:bg-krem/50 shadow-sm"
          : "w-full px-4 py-2 bg-white text-kayu border-krem-gelap hover:bg-krem hover:border-kayu/30 shadow-sm"
      }`}
      title="Cetak Lembar Kerja Dapur (KOT) atau Nota"
    >
      <span aria-hidden="true">🖨️</span>
      <span>Cetak Bon / Nota</span>
    </Link>
  );
}

