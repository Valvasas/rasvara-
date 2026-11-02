"use client";

import { useState } from "react";
import { IkonMata, IkonMataCoret } from "@/components/ikon/Ikon";

interface InputSandiProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  autoComplete?: string;
  minLength?: number;
  /** Tautan kecil di kanan label, mis. "Lupa kata sandi?". */
  tautanLabel?: React.ReactNode;
  /** Dipanggil setiap isian berubah — mis. untuk daftar syarat sandi yang hidup. */
  onNilai?: (nilai: string) => void;
  describedBy?: string;
}

/** Input kata sandi dengan tombol mata untuk menampilkan/menyembunyikan isian. */
export function InputSandi({
  id,
  name,
  label,
  placeholder,
  required,
  error,
  autoComplete = "current-password",
  minLength,
  onNilai,
  describedBy,
  tautanLabel,
}: InputSandiProps) {
  const [tampil, setTampil] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const idGalat = `${id}-galat`;
  const idCaps = `${id}-caps`;
  // Caps Lock yang tak sengaja menyala adalah penyebab "sandi salah" paling
  // umum di laptop. Dibaca dari tombol yang ditekan (tidak ada API lain).
  const periksaCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {tautanLabel}
      </div>
      <div className="relative">
        <input
          type={tampil ? "text" : "password"}
          id={id}
          name={name}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? idGalat : null, capsLock ? idCaps : null, describedBy].filter(Boolean).join(" ") || undefined}
          onChange={onNilai ? (e) => onNilai(e.target.value) : undefined}
          onKeyDown={periksaCaps}
          onKeyUp={periksaCaps}
          onBlur={() => setCapsLock(false)}
          className={`isian pr-12 ${error ? "isian-galat" : ""}`}
        />
        <button
          type="button"
          onClick={() => setTampil((v) => !v)}
          aria-pressed={tampil}
          aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[8px] flex items-center justify-center text-arang-sedang hover:text-arang hover:bg-beras-tua transition-colors cursor-pointer"
        >
          {tampil ? <IkonMataCoret className="w-5 h-5" /> : <IkonMata className="w-5 h-5" />}
        </button>
      </div>
      {capsLock && (
        <p id={idCaps} role="status" className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-kunyit-lembut px-2 py-1 text-[13px] font-semibold text-kunyit-tua">
          <span aria-hidden="true" className="font-presisi">⇪</span>
          Caps Lock menyala
        </p>
      )}
      {error && (
        <p id={idGalat} className="pesan-galat">
          {error}
        </p>
      )}
    </div>
  );
}
