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
}

/** Input kata sandi dengan tombol mata untuk menampilkan/menyembunyikan isian. */
export function InputSandi({
  id,
  name,
  label,
  placeholder,
  required,
  error,
}: InputSandiProps) {
  const [tampil, setTampil] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={tampil ? "text" : "password"}
          id={id}
          name={name}
          required={required}
          placeholder={placeholder}
          className="w-full min-h-[48px] pl-4 pr-12 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
        />
        <button
          type="button"
          onClick={() => setTampil((v) => !v)}
          aria-pressed={tampil}
          aria-label={tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-kayu-sedang hover:text-bata hover:bg-krem-tua transition-colors cursor-pointer"
        >
          {tampil ? <IkonMataCoret className="w-5 h-5" /> : <IkonMata className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-xs text-bahaya mt-1">{error}</p>}
    </div>
  );
}
