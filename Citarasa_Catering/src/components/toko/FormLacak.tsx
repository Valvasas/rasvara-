"use client";

import { useActionState, useState } from "react";
import { aksiLacakPesanan } from "@/app/aksi/pesanan";

interface FormLacakProps {
  pesanAwal?: string;
}

export function FormLacak({ pesanAwal }: FormLacakProps) {
  const [state, action, isPending] = useActionState(aksiLacakPesanan, null);
  // Terkendali: React 19 mengosongkan isian tak-terkendali setelah aksi
  // selesai, jadi tanpa ini pembeli yang salah ketik satu huruf harus
  // mengetik ulang kode dan nomornya.
  const [kode, setKode] = useState("");
  const [telepon, setTelepon] = useState("");

  const pesan = state?.pesan || pesanAwal;

  return (
    <form action={action} className="space-y-5" noValidate>
      {pesan && (
        <div role="alert" className={state?.pesan ? "kotak-galat" : "kotak-info bg-krem-tua border-krem-gelap text-kayu"}>
          {pesan}
        </div>
      )}

      <div>
        <label htmlFor="kode" className="label">
          Kode pesanan
        </label>
        <input
          type="text"
          id="kode"
          name="kode"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          placeholder="CR-261001-XXXXXX"
          aria-invalid={state?.kesalahan?.kode ? true : undefined}
          className={`isian font-mono tracking-wide ${state?.kesalahan?.kode ? "isian-galat" : ""}`}
        />
        {state?.kesalahan?.kode && <p className="pesan-galat">{state.kesalahan.kode[0]}</p>}
      </div>

      <div>
        <label htmlFor="telepon" className="label">
          Nomor WhatsApp saat memesan
        </label>
        <input
          type="tel"
          id="telepon"
          name="telepon"
          inputMode="tel"
          autoComplete="tel"
          required
          maxLength={20}
          value={telepon}
          onChange={(e) => setTelepon(e.target.value)}
          placeholder="08xxxxxxxxxx"
          aria-invalid={state?.kesalahan?.telepon ? true : undefined}
          className={`isian ${state?.kesalahan?.telepon ? "isian-galat" : ""}`}
        />
        {state?.kesalahan?.telepon && <p className="pesan-galat">{state.kesalahan.telepon[0]}</p>}
      </div>

      <button type="submit" disabled={isPending} className="tombol-utama w-full">
        {isPending ? "Mencari..." : "Lihat status"}
      </button>
    </form>
  );
}
