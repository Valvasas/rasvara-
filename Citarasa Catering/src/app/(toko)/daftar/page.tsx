"use client";

import { useActionState } from "react";
import Link from "next/link";
import { aksiDaftar } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";
import { IkonMangkuk } from "@/components/ikon/Ikon";

export default function HalamanDaftar() {
  const [state, action, isPending] = useActionState(aksiDaftar, null);

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <div className="bg-white rounded-3xl border border-krem-gelap p-6 sm:p-10 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-daun-lembut text-daun-tua mx-auto flex items-center justify-center">
            <IkonMangkuk className="w-6 h-6" />
          </div>
          <h1 className="font-tampil text-2xl font-bold text-kayu">Daftar Akun</h1>
          <p className="text-xs text-kayu-sedang">
            Buat akun untuk memudahkan pemesanan katering berikutnya dan menyimpan
            alamat pengiriman Anda.
          </p>
        </div>

        <form action={action} className="space-y-4">
          {state?.pesan && (
            <div className="p-3 bg-bahaya-lembut border border-bahaya/30 text-bahaya rounded-xl text-xs font-medium text-center">
              {state.pesan}
            </div>
          )}

          <div>
            <label
              htmlFor="nama"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Nama Lengkap
            </label>
            <input
              type="text"
              id="nama"
              name="nama"
              required
              placeholder="Contoh: Ibu Ratna Kusuma"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
            {state?.kesalahan?.nama && (
              <p className="text-xs text-bahaya mt-1">
                {state.kesalahan.nama[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="telepon"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="tel"
              id="telepon"
              name="telepon"
              inputMode="tel"
              required
              placeholder="081234567890"
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
            {state?.kesalahan?.telepon && (
              <p className="text-xs text-bahaya mt-1">
                {state.kesalahan.telepon[0]}
              </p>
            )}
          </div>

          <InputSandi
            id="sandi"
            name="sandi"
            label="Kata Sandi"
            placeholder="Minimal 6 karakter"
            required
            error={state?.kesalahan?.sandi?.[0]}
          />

          <div>
            <label
              htmlFor="alamat"
              className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
            >
              Alamat Pengiriman Default (Opsional)
            </label>
            <textarea
              id="alamat"
              name="alamat"
              rows={2}
              placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
              className="w-full p-3 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua disabled:opacity-60 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{isPending ? "Mendaftarkan..." : "Daftar Sekarang"}</span>
            {!isPending && <span aria-hidden="true">&rarr;</span>}
          </button>

          <div className="pt-2 text-center text-xs text-kayu-sedang">
            <span>Sudah memiliki akun? </span>
            <Link href="/masuk" className="font-bold text-bata hover:underline">
              Masuk di sini
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

