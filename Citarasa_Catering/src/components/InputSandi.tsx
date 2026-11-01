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
}: InputSandiProps) {
  const [tampil, setTampil] = useState(false);
  const idGalat = `${id}-galat`;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
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
          aria-describedby={[error ? idGalat : null, describedBy].filter(Boolean).join(" ") || undefined}
          onChange={onNilai ? (e) => onNilai(e.target.value) : undefined}
          className={`isian pr-12 ${error ? "isian-galat" : ""}`}
        />
        <button
          type="button"
          onClick={() => setTampil((v) => !v)}
          aria-pressed={tampil}
          aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg flex items-center justify-center text-kayu-sedang hover:text-kayu hover:bg-krem-tua transition-colors cursor-pointer"
        >
          {tampil ? <IkonMataCoret className="w-5 h-5" /> : <IkonMata className="w-5 h-5" />}
        </button>
      </div>
      {error && (
        <p id={idGalat} className="pesan-galat">
          {error}
        </p>
      )}
    </div>
  );
}
