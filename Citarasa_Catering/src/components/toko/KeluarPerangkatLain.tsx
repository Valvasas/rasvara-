"use client";

import { useActionState, useState } from "react";
import { aksiKeluarPerangkatLain } from "@/app/aksi/auth";
import { IkonPerangkat } from "@/components/ikon/Ikon";

/**
 * "Keluar dari semua perangkat lain" dengan konfirmasi dua langkah di tempat
 * (tanpa confirm() bawaan peramban — lihat aturan design system).
 */
export function KeluarPerangkatLain() {
  const [state, action, isPending] = useActionState(aksiKeluarPerangkatLain, null);
  const [yakin, setYakin] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-10 h-10 shrink-0 rounded-[10px] bg-beras-tua text-arang flex items-center justify-center">
        <IkonPerangkat className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-arang">Keluar dari perangkat lain</p>
        <p className="text-[13px] text-arang-sedang">
          Pernah masuk di HP teman atau HP lama hilang? Semua sesi selain perangkat ini akan dihentikan.
        </p>
        {state?.pesan && (
          <p role={state.sukses ? "status" : "alert"} className={`mt-2 ${state.sukses ? "kotak-sukses" : "kotak-galat"}`}>
            {state.pesan}
          </p>
        )}
      </div>
      {yakin && !state?.sukses ? (
        <form action={action} className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setYakin(false)} className="tombol-hantu tombol-kecil">
            Batal
          </button>
          <button type="submit" disabled={isPending} className="tombol-bahaya tombol-kecil">
            {isPending ? "Memproses…" : "Ya, keluarkan"}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setYakin(true)} disabled={state?.sukses} className="tombol-kedua tombol-kecil shrink-0">
          Keluarkan semua
        </button>
      )}
    </div>
  );
}
