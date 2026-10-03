"use client";

import { useTransition } from "react";
import { aksiToggleBahan } from "@/app/aksi/bahan";

/** Bahan nonaktif tidak muncul di pilihan resep baru; resep lama tetap utuh. */
export function SaklarBahan({ id, aktif, nama }: { id: string; aktif: boolean; nama: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aktif}
      aria-label={`Bahan ${nama} aktif`}
      disabled={isPending}
      onClick={() => startTransition(async () => void (await aksiToggleBahan(id, !aktif)))}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${aktif ? "bg-daun" : "bg-krem-gelap"}`}
    >
      <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${aktif ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}
