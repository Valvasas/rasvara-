"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cariPesanan, type HasilPesanan } from "@/app/aksi/pesanan";

function TombolCari() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="tombol tombol-utama w-full" disabled={pending}>
      {pending ? "Mencari..." : "Lihat Pesanan Saya"}
    </button>
  );
}

export function FormLacak({ kodeAwal }: { kodeAwal: string }) {
  const [hasil, kirim] = useActionState<HasilPesanan, FormData>(cariPesanan, {});

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

      <div>
        <label htmlFor="kode" className="label-isian">
          Kode pesanan
        </label>
        <input
          id="kode"
          name="kode"
          type="text"
          required
          defaultValue={kodeAwal}
          placeholder="CR-260912-K7QP"
          autoCapitalize="characters"
          className="kolom-isian font-judul text-lg tracking-wide"
        />
        <p className="mt-1.5 text-[0.85rem] text-arang-muda">
          Kode ini muncul setelah Anda mengirim pesanan dan kami kirim lewat
          WhatsApp.
        </p>
      </div>

      <div>
        <label htmlFor="telepon" className="label-isian">
          Nomor HP yang dipakai saat memesan
        </label>
        <input
          id="telepon"
          name="telepon"
          type="tel"
          required
          inputMode="tel"
          placeholder="0812xxxxxxx"
          className="kolom-isian"
        />
      </div>

      <TombolCari />
    </form>
  );
}
