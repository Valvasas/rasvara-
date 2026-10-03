"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { aksiDaftar } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";

export default function HalamanDaftar() {
  const [state, action, isPending] = useActionState(aksiDaftar, null);
  // Terkendali supaya isian tidak hilang saat pendaftaran ditolak.
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const galat = state?.kesalahan ?? {};

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="font-tampil text-3xl font-bold text-kayu">Buat akun</h1>
      <p className="teks-redup mt-2">
        Supaya data pemesan terisi otomatis dan riwayat pesanan tersimpan.
      </p>

      <form action={action} noValidate className="kartu kartu-isi mt-6 space-y-5">
        {state?.pesan && (
          <div role="alert" className="kotak-galat">
            {state.pesan}
          </div>
        )}

        <div>
          <label htmlFor="nama" className="label">Nama</label>
          <input
            type="text"
            id="nama"
            name="nama"
            required
            maxLength={100}
            autoComplete="name"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            aria-invalid={galat.nama ? true : undefined}
            className={`isian ${galat.nama ? "isian-galat" : ""}`}
          />
          {galat.nama && <p className="pesan-galat">{galat.nama[0]}</p>}
        </div>

        <div>
          <label htmlFor="telepon" className="label">Nomor WhatsApp</label>
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
            aria-invalid={galat.telepon ? true : undefined}
            className={`isian ${galat.telepon ? "isian-galat" : ""}`}
          />
          {galat.telepon ? (
            <p className="pesan-galat">{galat.telepon[0]}</p>
          ) : (
            <p className="petunjuk">Dipakai untuk masuk.</p>
          )}
        </div>

        <InputSandi
          id="sandi"
          name="sandi"
          label="Kata sandi"
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
          minLength={8}
          required
          error={galat.sandi?.[0]}
        />

        <div>
          <label htmlFor="alamat" className="label">
            Alamat antar <span className="font-normal text-kayu-sedang">(opsional)</span>
          </label>
          <textarea
            id="alamat"
            name="alamat"
            rows={2}
            maxLength={500}
            autoComplete="street-address"
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            className="isian py-2.5"
          />
        </div>

        <button type="submit" disabled={isPending} className="tombol-utama w-full">
          {isPending ? "Membuat akun..." : "Buat akun"}
        </button>

        <p className="text-center text-sm text-kayu-sedang">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-bata hover:underline">
            Masuk
          </Link>
        </p>
      </form>
    </div>
  );
}
