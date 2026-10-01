"use client";

import { useState, useTransition } from "react";
import { aksiHapusKas } from "@/app/aksi/kas";

/** Hapus catatan manual dengan konfirmasi dua langkah di tempat. */
export function TombolHapusKas({ id }: { id: string }) {
  const [yakin, setYakin] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const klik = () => {
    if (!yakin) {
      setYakin(true);
      return;
    }
    startTransition(async () => {
      try {
        const hasil = await aksiHapusKas(id);
        if (!hasil.sukses) setGalat(hasil.pesan ?? "Gagal menghapus.");
      } catch {
        setGalat("Sesi berakhir. Muat ulang halaman.");
      }
      setYakin(false);
    });
  };

  return (
    <span className="inline-flex items-center gap-1">
      {galat && <span role="alert" className="text-xs text-bahaya mr-1">{galat}</span>}
      {yakin && !isPending && (
        <button type="button" onClick={() => setYakin(false)} className="tombol-hantu tombol-kecil px-2">
          Batal
        </button>
      )}
      <button
        type="button"
        onClick={klik}
        disabled={isPending}
        className={`tombol tombol-kecil px-2 ${yakin ? "bg-bahaya text-white" : "text-kayu-sedang hover:text-bahaya hover:bg-bahaya-lembut"}`}
      >
        {isPending ? "Menghapus..." : yakin ? "Hapus?" : "Hapus"}
      </button>
    </span>
  );
}
