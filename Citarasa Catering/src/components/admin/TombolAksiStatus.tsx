"use client";

import { useTransition } from "react";
import { aksiPindahStatus } from "@/app/aksi/pesanan";
import type { StatusPesanan } from "@/generated/prisma/client";

interface TombolAksiStatusProps {
  kode: string;
  statusBaru: StatusPesanan;
  label: string;
  warna?: "bata" | "daun" | "kunyit";
}

export function TombolAksiStatus({
  kode,
  statusBaru,
  label,
  warna = "bata",
}: TombolAksiStatusProps) {
  const [isPending, startTransition] = useTransition();

  const handleKlik = () => {
    startTransition(async () => {
      await aksiPindahStatus(kode, statusBaru);
    });
  };

  const kelasWarna = {
    bata: "bg-bata text-white hover:bg-bata-tua",
    daun: "bg-daun text-white hover:bg-daun-tua",
    kunyit: "bg-kunyit text-kayu hover:bg-kunyit-lembut",
  }[warna];

  return (
    <button
      type="button"
      onClick={handleKlik}
      disabled={isPending}
      className={`min-h-[48px] px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer w-full ${kelasWarna}`}
    >
      <span>{isPending ? "Memperbarui..." : label}</span>
      {!isPending && <span aria-hidden="true">&rarr;</span>}
    </button>
  );
}

