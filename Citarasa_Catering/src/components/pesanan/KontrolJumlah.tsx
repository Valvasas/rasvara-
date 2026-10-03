"use client";

import { useEffect, useState } from "react";
import { IkonKurang, IkonTambah, IkonTutup } from "@/components/ikon/Ikon";

/** Batas atas sama dengan validasi server, supaya input tidak bisa melampauinya. */
export const MAKS_JUMLAH = 5000;

/**
 * Kontrol jumlah: tombol −/+ untuk penyesuaian kecil dan kolom angka untuk
 * pesanan besar. Memesan 150 kotak tidak boleh berarti 140 kali menekan "+".
 */
export function KontrolJumlah({
  jumlah,
  min,
  satuan,
  nama,
  onUbah,
}: {
  jumlah: number;
  min: number;
  satuan: string;
  nama: string;
  onUbah: (n: number) => void;
}) {
  const [draf, setDraf] = useState(String(jumlah));
  useEffect(() => setDraf(String(jumlah)), [jumlah]);

  const terapkan = () => {
    const n = Math.floor(Number(draf));
    if (!Number.isFinite(n) || n <= 0) {
      setDraf(String(jumlah));
      return;
    }
    onUbah(Math.min(MAKS_JUMLAH, Math.max(min, n)));
  };

  return (
    <div className="flex items-center rounded-xl border border-krem-gelap bg-white">
      <button
        type="button"
        onClick={() => onUbah(jumlah - 1 < min ? 0 : jumlah - 1)}
        aria-label={jumlah - 1 < min ? `Hapus ${nama}` : `Kurangi ${nama}`}
        className="w-10 h-10 flex items-center justify-center text-kayu-sedang hover:text-kayu cursor-pointer rounded-l-xl"
      >
        {jumlah - 1 < min ? <IkonTutup className="w-4 h-4" /> : <IkonKurang className="w-4 h-4" />}
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={MAKS_JUMLAH}
        value={draf}
        onChange={(e) => {
          setDraf(e.target.value);
          // Angka yang sudah sah langsung diterapkan: ringkasan ikut berubah saat
          // mengetik, dan klik "Simpan" tanpa keluar dari isian tidak memakai angka lama.
          // Angka di bawah minimal (mis. "7" saat hendak mengetik "70") menunggu blur.
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= min && n <= MAKS_JUMLAH && n !== jumlah) onUbah(n);
        }}
        onBlur={terapkan}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            terapkan();
          }
        }}
        aria-label={`Jumlah ${nama} (${satuan})`}
        className="w-14 h-10 text-center text-sm font-semibold text-kayu angka-tabel bg-transparent border-x border-krem-gelap focus:outline-none focus:bg-krem [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onUbah(Math.min(MAKS_JUMLAH, jumlah + 1))}
        aria-label={`Tambah ${nama}`}
        className="w-10 h-10 flex items-center justify-center text-kayu-sedang hover:text-kayu cursor-pointer rounded-r-xl"
      >
        <IkonTambah className="w-4 h-4" />
      </button>
    </div>
  );
}

