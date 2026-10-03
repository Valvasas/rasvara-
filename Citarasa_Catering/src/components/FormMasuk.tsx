"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { aksiMasuk } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";

export function FormMasuk() {
  const [state, action, isPending] = useActionState(aksiMasuk, null);
  // Terkendali supaya nomor HP tidak ikut terhapus saat sandi salah.
  const [telepon, setTelepon] = useState("");

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.pesan && (
        <div role="alert" className="kotak-galat">
          {state.pesan}
        </div>
      )}

      <div>
        <label htmlFor="telepon" className="label">
          Nomor HP
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
        {state?.kesalahan?.telepon && (
          <p className="pesan-galat">{state.kesalahan.telepon[0]}</p>
        )}
      </div>

      <InputSandi
        id="sandi"
        name="sandi"
        label="Kata sandi"
        required
        error={state?.kesalahan?.sandi?.[0]}
      />

      <button type="submit" disabled={isPending} className="tombol-utama w-full">
        {isPending ? "Memeriksa..." : "Masuk"}
      </button>

      <p className="text-center text-sm text-kayu-sedang">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-bata hover:underline">
          Daftar
        </Link>
      </p>
    </form>
  );
}
