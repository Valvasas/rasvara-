"use client";

import { useTransition } from "react";
import { aksiKonfirmasiBayar } from "@/app/aksi/pesanan";

export function TombolKonfirmasiBayar({ kode }: { kode: string }) {
  const [isPending, startTransition] = useTransition();

  const handleKonfirmasi = () => {
    startTransition(async () => {
      await aksiKonfirmasiBayar(kode);
    });
  };

  return (
    <button
      type="button"
      onClick={handleKonfirmasi}
      disabled={isPending}
      className="min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-daun hover:bg-daun-tua disabled:opacity-50 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span>{isPending ? "Mengirim Konfirmasi..." : "Saya Sudah Transfer"}</span>
    </button>
  );
}

