"use client";

import { useState } from "react";
import { teleponHpSah, teleponLokalDariInput } from "@/lib/format";

interface InputTeleponProps {
  id: string;
  name: string;
  label: string;
  nilai: string;
  /** Menerima digit setelah +62 ("812…"). */
  onNilai: (nilai: string) => void;
  error?: string;
  petunjuk?: string;
  required?: boolean;
  autoFocus?: boolean;
}

/**
 * Isian nomor HP dengan awalan "+62" yang tetap (pola aplikasi pesan-antar
 * yang sudah dihafal pembeli). Apa pun cara orang menulis nomornya — "0812…",
 * "+62 812…", atau menempel "0812-3456-7890" dari kontak — isinya
 * disederhanakan jadi digit setelah kode negara. Server tetap menormalkan
 * ulang, jadi ini murni kenyamanan, bukan pengaman.
 *
 * Peringatan format baru muncul setelah kolom ditinggalkan (blur), bukan
 * saat masih mengetik: memarahi orang yang baru mengetik "08" itu menyebalkan.
 */
export function InputTelepon({
  id,
  name,
  label,
  nilai,
  onNilai,
  error,
  petunjuk,
  required,
  autoFocus,
}: InputTeleponProps) {
  const [disentuh, setDisentuh] = useState(false);
  const formatSalah = disentuh && nilai.length > 0 && !teleponHpSah(nilai);
  const pesan = error ?? (formatSalah ? "Periksa lagi nomornya — nomor HP Indonesia diawali 8 setelah +62, 10–13 digit." : null);
  const idPesan = `${id}-pesan`;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div
        className={`flex items-stretch rounded-[10px] border-[1.5px] bg-white transition-colors focus-within:ring-4 ${
          pesan
            ? "border-bahaya focus-within:border-bahaya focus-within:ring-bahaya/15"
            : "border-beras-gelap hover:border-arang-sedang/35 focus-within:border-pandan focus-within:ring-pandan/12"
        }`}
      >
        <span
          aria-hidden="true"
          className="flex items-center gap-1.5 pl-4 pr-3 font-presisi text-base font-semibold text-arang border-r border-beras-gelap select-none"
        >
          +62
        </span>
        <input
          type="tel"
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          autoFocus={autoFocus}
          // Tanpa maxLength: nomor tempelan "+62 812-3456-7890" lebih panjang dari
          // digitnya dan akan terpotong sebelum sempat dibersihkan.
          value={nilai}
          onChange={(e) => onNilai(teleponLokalDariInput(e.target.value))}
          onBlur={() => setDisentuh(true)}
          placeholder="812 3456 7890"
          aria-invalid={pesan ? true : undefined}
          aria-describedby={pesan || petunjuk ? idPesan : undefined}
          className="min-w-0 flex-1 min-h-[45px] px-3 bg-transparent rounded-r-[10px] font-presisi text-base tracking-wide text-arang placeholder:text-arang-sedang/45 focus:outline-none"
        />
      </div>
      {pesan ? (
        <p id={idPesan} className="pesan-galat">
          {pesan}
        </p>
      ) : petunjuk ? (
        <p id={idPesan} className="petunjuk">
          {petunjuk}
        </p>
      ) : null}
    </div>
  );
}
