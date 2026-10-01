"use client";

import { useState, useTransition } from "react";
import { aksiToggleAktifMenu } from "@/app/aksi/menu";

/** Saklar tampil/sembunyi menu di katalog pembeli. */
export function TombolToggleMenu({ id, aktif, nama }: { id: string; aktif: boolean; nama: string }) {
  const [isPending, startTransition] = useTransition();
  const [galat, setGalat] = useState(false);

  const ubah = () => {
    setGalat(false);
    startTransition(async () => {
      try {
        await aksiToggleAktifMenu(id, !aktif);
      } catch {
        setGalat(true);
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={aktif}
        aria-label={`Tampilkan ${nama} di katalog`}
        onClick={ubah}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
          aktif ? "bg-daun" : "bg-krem-gelap"
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            aktif ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className={`text-xs ${galat ? "text-bahaya" : "text-kayu-sedang"}`}>
        {galat ? "Gagal, coba lagi" : aktif ? "Tampil" : "Disembunyikan"}
      </span>
    </span>
  );
}
