"use client";

import { useTransition } from "react";
import { aksiToggleAktifMenu } from "@/app/aksi/menu";

export function TombolToggleMenu({
  id,
  aktif,
}: {
  id: string;
  aktif: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await aksiToggleAktifMenu(id, !aktif);
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
        aktif
          ? "bg-daun-lembut text-daun-tua hover:bg-bahaya-lembut hover:text-bahaya border border-daun/40"
          : "bg-krem-gelap text-kayu-sedang hover:bg-daun-lembut hover:text-daun-tua border border-krem-gelap"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          aktif ? "bg-daun" : "bg-kayu-sedang"
        }`}
      />
      <span>
        {isPending ? "Menyimpan..." : aktif ? "Menu Aktif" : "Dinonaktifkan"}
      </span>
    </button>
  );
}

