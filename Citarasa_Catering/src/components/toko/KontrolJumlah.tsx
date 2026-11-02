"use client";

import { useEffect, useState } from "react";
import { IkonKurang, IkonSampah, IkonTambah } from "@/components/ikon/Ikon";
import { MAKS_JUMLAH } from "@/lib/keranjang";

interface KontrolJumlahProps {
  jumlah: number;
  min: number;
  satuan: string;
  nama: string;
  onUbah: (n: number) => void;
  ukuran?: "biasa" | "kecil";
  /** false = di jumlah minimal tombol "−" mati, bukan berubah jadi hapus (mis. halaman detail menu). */
  bisaHapus?: boolean;
}

/**
 * Stepper jumlah: tombol −/+ untuk penyesuaian kecil dan kolom angka untuk
 * pesanan besar. Memesan 150 kotak tidak boleh berarti 140 kali menekan "+".
 *
 * Di jumlah minimal, tombol "−" berubah menjadi ikon tempat sampah — pola
 * yang sudah dikenal dari aplikasi pesan-antar, sehingga pembeli paham bahwa
 * tekanan berikutnya menghapus menu, bukan mengurangi.
 */
export function KontrolJumlah({ jumlah, min, satuan, nama, onUbah, ukuran = "biasa", bisaHapus = true }: KontrolJumlahProps) {
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

  const diMinimal = jumlah - 1 < min;
  const akanHapus = diMinimal && bisaHapus;
  const kotak = ukuran === "kecil" ? "w-9 h-9" : "w-11 h-11";

  return (
    <div className="inline-flex items-center rounded-xl border-[1.5px] border-pandan/40 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onUbah(akanHapus ? 0 : jumlah - 1)}
        disabled={diMinimal && !bisaHapus}
        aria-label={akanHapus ? `Hapus ${nama} dari pesanan` : `Kurangi ${nama}`}
        className={`${kotak} flex items-center justify-center rounded-l-[10px] cursor-pointer transition-colors active:scale-90 disabled:opacity-35 disabled:cursor-not-allowed ${
          akanHapus ? "text-bahaya hover:bg-bahaya-lembut" : "text-pandan-tua hover:bg-pandan-lembut"
        }`}
      >
        {akanHapus ? <IkonSampah className="w-[18px] h-[18px]" /> : <IkonKurang className="w-[18px] h-[18px]" strokeWidth={2.5} />}
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={MAKS_JUMLAH}
        value={draf}
        onChange={(e) => setDraf(e.target.value)}
        onBlur={terapkan}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            terapkan();
          }
        }}
        aria-label={`Jumlah ${nama} (${satuan})`}
        className={`${ukuran === "kecil" ? "w-11 h-9" : "w-14 h-11"} text-center text-base font-bold text-arang angka-tabel bg-transparent border-x border-pandan/20 focus:outline-none focus:bg-pandan-lembut/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <button
        type="button"
        onClick={() => onUbah(Math.min(MAKS_JUMLAH, jumlah + 1))}
        disabled={jumlah >= MAKS_JUMLAH}
        aria-label={`Tambah ${nama}`}
        className={`${kotak} flex items-center justify-center rounded-r-[10px] text-pandan-tua hover:bg-pandan-lembut cursor-pointer transition-colors active:scale-90 disabled:opacity-40`}
      >
        <IkonTambah className="w-[18px] h-[18px]" strokeWidth={2.5} />
      </button>
    </div>
  );
}
