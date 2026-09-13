"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { daftar, masuk, type HasilForm } from "@/app/aksi/auth";

function TombolKirim({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="tombol tombol-utama w-full" disabled={pending}>
      {pending ? "Mohon tunggu..." : label}
    </button>
  );
}

export function FormMasuk({ mode }: { mode: "masuk" | "daftar" }) {
  const aksi = mode === "masuk" ? masuk : daftar;
  const [hasil, kirim] = useActionState<HasilForm, FormData>(aksi, {});

  return (
    <form action={kirim} className="space-y-4">
      {hasil.error ? (
        <p
          role="alert"
          className="rounded-xl border-2 border-bahaya/30 bg-bahaya-lembut px-4 py-3 text-[0.95rem] text-bahaya"
        >
          {hasil.error}
        </p>
      ) : null}

      {mode === "daftar" ? (
        <div>
          <label htmlFor="nama" className="label-isian">
            Nama lengkap
          </label>
          <input
            id="nama"
            name="nama"
            type="text"
            required
            autoComplete="name"
            placeholder="Contoh: Ibu Sri Wahyuni"
            className="kolom-isian"
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="telepon" className="label-isian">
          Nomor HP
        </label>
        <input
          id="telepon"
          name="telepon"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="0812xxxxxxx"
          className="kolom-isian"
          aria-describedby="bantuan-telepon"
        />
        <p id="bantuan-telepon" className="mt-1.5 text-[0.85rem] text-arang-muda">
          Pakai nomor WhatsApp aktif. Nomor ini juga jadi nama akun Anda.
        </p>
      </div>

      <div>
        <label htmlFor="sandi" className="label-isian">
          Kata sandi
        </label>
        <input
          id="sandi"
          name="sandi"
          type="password"
          required
          minLength={mode === "daftar" ? 8 : undefined}
          autoComplete={mode === "daftar" ? "new-password" : "current-password"}
          className="kolom-isian"
          aria-describedby={mode === "daftar" ? "bantuan-sandi" : undefined}
        />
        {mode === "daftar" ? (
          <p id="bantuan-sandi" className="mt-1.5 text-[0.85rem] text-arang-muda">
            Minimal 8 karakter.
          </p>
        ) : null}
      </div>

      <TombolKirim label={mode === "masuk" ? "Masuk" : "Daftar Sekarang"} />

      <p className="pt-1 text-center text-[0.95rem] text-arang-muda">
        {mode === "masuk" ? (
          <>
            Belum punya akun?{" "}
            <Link
              href="/daftar"
              className="font-semibold text-bata underline underline-offset-4"
            >
              Daftar di sini
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link
              href="/masuk"
              className="font-semibold text-bata underline underline-offset-4"
            >
              Masuk di sini
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
