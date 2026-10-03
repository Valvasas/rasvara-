"use client";

import { useEffect, useState, useTransition } from "react";
import { aksiUbahHargaBahan } from "@/app/aksi/bahan";

/**
 * Harga bahan yang bisa diubah langsung di tabel — harga pasar berubah tiap
 * minggu, dan membuka halaman edit untuk satu angka terlalu lambat.
 * Tersimpan saat isian ditinggalkan atau Enter ditekan.
 */
export function HargaBahan({ id, harga, nama }: { id: string; harga: number; nama: string }) {
  const [nilai, setNilai] = useState(String(harga));
  const [status, setStatus] = useState<"diam" | "simpan" | "ok" | "galat">("diam");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setNilai(String(harga)), [harga]);

  const simpan = () => {
    const n = Math.floor(Number(nilai));
    if (!Number.isFinite(n) || n < 0) {
      setNilai(String(harga));
      return;
    }
    if (n === harga) return;
    setStatus("simpan");
    startTransition(async () => {
      try {
        const h = await aksiUbahHargaBahan(id, n);
        setStatus(h.sukses ? "ok" : "galat");
      } catch {
        setStatus("galat");
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={nilai}
        aria-label={`Harga ${nama} per satuan`}
        disabled={isPending}
        onChange={(e) => {
          setNilai(e.target.value);
          setStatus("diam");
        }}
        onBlur={simpan}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="isian min-h-[36px] w-32 text-right angka-tabel"
      />
      <span aria-live="polite" className={`text-xs w-14 ${status === "galat" ? "text-bahaya" : "text-daun-tua"}`}>
        {status === "simpan" ? "…" : status === "ok" ? "Tersimpan" : status === "galat" ? "Gagal" : ""}
      </span>
    </span>
  );
}
