"use client";

import Link from "next/link";
import { IkonCetak } from "@/components/ikon/Ikon";

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
      className={ringkas ? "tombol-kedua" : "tombol-hantu tombol-kecil"}
      title="Cetak lembar dapur atau nota"
    >
      <IkonCetak className="w-4 h-4" />
      <span>Cetak</span>
    </Link>
  );
}

