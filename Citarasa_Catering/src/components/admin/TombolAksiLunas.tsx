"use client";

import { useTransition } from "react";
import { aksiTandaiLunas } from "@/app/aksi/pesanan";

export function TombolAksiLunas({ kode }: { kode: string }) {
  const [isPending, startTransition] = useTransition();

  const handleKlik = () => {
    if (!confirm(`Yakin ingin menandai pesanan ${kode} LUNAS? Uang akan otomatis dicatat ke Buku Kas.`)) {
      return;
    }
    startTransition(async () => {
      const res = await aksiTandaiLunas(kode);
      if (!res.sukses && res.pesan) {
        alert(res.pesan);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleKlik}
      disabled={isPending}
      className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold text-daun-tua bg-daun-lembut hover:bg-daun hover:text-white transition-colors border border-daun/40 disabled:opacity-50 inline-flex items-center justify-center gap-1 cursor-pointer w-full"
    >
      <span>{isPending ? "Mencatat Kas..." : "✓ Tandai Lunas"}</span>
    </button>
  );
}

