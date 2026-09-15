"use client";

import { useActionState } from "react";
import { aksiLacakPesanan } from "@/app/aksi/pesanan";
import { IkonPeringatan } from "@/components/ikon/Ikon";

interface FormLacakProps {
  pesanAwal?: string;
}

export function FormLacak({ pesanAwal }: FormLacakProps) {
  const [state, action, isPending] = useActionState(aksiLacakPesanan, null);

  const pesanKesalahan = state?.pesan || pesanAwal;

  return (
    <form action={action} className="space-y-4">
      {pesanKesalahan && (
        <div
          role="alert"
          className="p-3.5 bg-bahaya-lembut border border-bahaya/30 text-bahaya rounded-2xl text-xs font-semibold text-center flex items-center justify-center gap-2 anim-masuk"
        >
          <IkonPeringatan className="w-4 h-4 shrink-0" />
          <span>{pesanKesalahan}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="kode"
          className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5"
        >
          Kode Pesanan
        </label>
        <input
          type="text"
          id="kode"
          name="kode"
          required
          autoComplete="off"
          placeholder="Contoh: CR-260915-K7QP"
          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu font-mono text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata uppercase tracking-wider font-bold"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
          }}
        />
        {state?.kesalahan?.kode && (
          <p className="text-[11px] text-bahaya mt-1">
            {state.kesalahan.kode[0]}
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
          placeholder="Contoh: 081234567890"
          className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm placeholder:text-kayu-sedang/50 focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata font-mono"
        />
        {state?.kesalahan?.telepon && (
          <p className="text-[11px] text-bahaya mt-1">
            {state.kesalahan.telepon[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[48px] px-6 py-3 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <span>{isPending ? "Memeriksa Pesanan..." : "Buka Status Pesanan"}</span>
        {!isPending && <span aria-hidden="true">&rarr;</span>}
      </button>
    </form>
  );
}

