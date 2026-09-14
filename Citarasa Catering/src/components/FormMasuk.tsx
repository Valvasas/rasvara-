"use client";

import { useActionState } from "react";
import Link from "next/link";
import { aksiMasuk } from "@/app/aksi/auth";

export function FormMasuk() {
  const [state, action, isPending] = useActionState(aksiMasuk, null);

  return (
    <form action={action} className="space-y-4">
      {state?.pesan && (
        <div className="p-3 bg-bahaya-lembut border border-bahaya/30 text-bahaya rounded-xl text-xs font-medium text-center">
          {state.pesan}
        </div>
      )}

      <div>
        <label
          htmlFor="telepon"
          className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
        >
          Nomor Telepon
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

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="sandi"
            className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang"
          >
            Kata Sandi
          </label>
        </div>
        <input
          type="password"
          id="sandi"
          name="sandi"
          required
          placeholder="••••••••"
          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata"
        />
        {state?.kesalahan?.sandi && (
          <p className="text-xs text-bahaya mt-1">
            {state.kesalahan.sandi[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[48px] px-6 py-3 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua disabled:opacity-60 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <span>{isPending ? "Memeriksa..." : "Masuk"}</span>
        {!isPending && <span aria-hidden="true">&rarr;</span>}
      </button>

      <div className="pt-2 text-center text-xs text-kayu-sedang">
        <span>Belum punya akun? </span>
        <Link href="/daftar" className="font-bold text-bata hover:underline">
          Daftar akun baru
        </Link>
      </div>
    </form>
  );
}

