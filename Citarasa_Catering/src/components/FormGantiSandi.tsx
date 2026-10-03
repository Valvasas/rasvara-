"use client";

import { useActionState, useEffect, useRef } from "react";
import { aksiGantiSandi } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";

/**
 * Ganti sandi untuk akun yang sedang login. Isian sengaja tidak terkendali:
 * setelah berhasil, formulir memang harus kosong lagi.
 */
export function FormGantiSandi({ untukDapur = false }: { untukDapur?: boolean }) {
  const [state, action, isPending] = useActionState(aksiGantiSandi, null);
  const formRef = useRef<HTMLFormElement>(null);
  const galat = state?.kesalahan ?? {};

  useEffect(() => {
    if (state?.sukses) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} noValidate className="space-y-4 max-w-sm">
      {state?.pesan && (
        <div role={state.sukses ? "status" : "alert"} className={state.sukses ? "kotak-sukses" : "kotak-galat"}>
          {state.pesan}
        </div>
      )}
      <InputSandi id="sandiLama" name="sandiLama" label="Kata sandi saat ini" required error={galat.sandiLama?.[0]} />
      <InputSandi
        id="sandiBaru"
        name="sandiBaru"
        label="Kata sandi baru"
        placeholder="Minimal 8 karakter"
        autoComplete="new-password"
        minLength={8}
        required
        error={galat.sandiBaru?.[0]}
      />
      <InputSandi
        id="ulangiSandi"
        name="ulangiSandi"
        label="Ulangi kata sandi baru"
        autoComplete="new-password"
        required
        error={galat.ulangiSandi?.[0]}
      />
      <button type="submit" disabled={isPending} className="tombol-utama">
        {isPending ? "Menyimpan..." : "Ganti kata sandi"}
      </button>
      {untukDapur && (
        <p className="petunjuk">Perangkat lain yang sedang masuk ke dashboard akan otomatis keluar.</p>
      )}
    </form>
  );
}
