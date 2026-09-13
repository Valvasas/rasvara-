"use client";

import { useTransition } from "react";
import { keluar } from "@/app/aksi/auth";

export function TombolKeluar({ kelas = "tombol tombol-kedua" }: { kelas?: string }) {
  const [menunggu, mulai] = useTransition();

  return (
    <button
      type="button"
      className={kelas}
      disabled={menunggu}
      onClick={() => mulai(() => keluar())}
    >
      {menunggu ? "Keluar..." : "Keluar"}
    </button>
  );
}
