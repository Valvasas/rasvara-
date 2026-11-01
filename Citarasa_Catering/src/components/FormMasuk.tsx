"use client";

import { useActionState, useState } from "react";
import { aksiMasuk } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";
import { IkonWhatsapp } from "@/components/ikon/Ikon";

export function FormMasuk({ ke, waLupaSandi }: { ke?: string; waLupaSandi?: string | null }) {
  const [state, action, isPending] = useActionState(aksiMasuk, null);
  // Terkendali supaya nomor HP tidak ikut terhapus saat sandi salah.
  const [telepon, setTelepon] = useState("");

  return (
    <form action={action} className="space-y-5" noValidate>
      {ke && <input type="hidden" name="ke" value={ke} />}
      {state?.pesan && (
        <div role="alert" className="kotak-galat">
          {state.pesan}
        </div>
      )}

      <div>
        <label htmlFor="telepon" className="label">
          Nomor HP / WhatsApp
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
          placeholder="0812 3456 7890"
          aria-invalid={state?.kesalahan?.telepon ? true : undefined}
          className={`isian ${state?.kesalahan?.telepon ? "isian-galat" : ""}`}
        />
        {state?.kesalahan?.telepon && <p className="pesan-galat">{state.kesalahan.telepon[0]}</p>}
      </div>

      <InputSandi id="sandi" name="sandi" label="Kata sandi" required error={state?.kesalahan?.sandi?.[0]} />

      <button type="submit" disabled={isPending} className="tombol-utama tombol-besar w-full">
        {isPending ? "Memeriksa…" : "Masuk"}
      </button>

      {waLupaSandi && (
        <a
          href={waLupaSandi}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-[14px] font-semibold text-kayu-sedang hover:text-kayu"
        >
          <IkonWhatsapp className="w-4 h-4 text-daun" />
          Lupa kata sandi? Minta bantuan dapur
        </a>
      )}
    </form>
  );
}
