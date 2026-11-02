"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { aksiMasuk } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";
import { InputTelepon } from "@/components/InputTelepon";
import { IkonKunci } from "@/components/ikon/Ikon";

interface FormMasukProps {
  ke?: string;
  /** Portal dapur: label & tombol menyebut dashboard, tanpa tautan daftar. */
  dapur?: boolean;
}

/**
 * Formulir masuk. Yang membuatnya "profesional" bukan hiasannya, tapi hal-hal
 * kecil yang menghapus keraguan:
 *  - nomor berawalan +62 tetap (tidak ada debat 08 vs 62),
 *  - "Lupa kata sandi?" tepat di sebelah label sandi, tempat mata mencarinya,
 *  - "Ingat saya" untuk HP pinjaman / komputer bersama,
 *  - peringatan Caps Lock,
 *  - galat diumumkan & fokus dipindah ke kolom yang perlu dibetulkan,
 *  - tombol menjelaskan apa yang sedang terjadi ("Memeriksa…").
 */
export function FormMasuk({ ke, dapur = false }: FormMasukProps) {
  const [state, action, isPending] = useActionState(aksiMasuk, null);
  // Terkendali supaya nomor HP tidak ikut terhapus saat sandi salah.
  const [telepon, setTelepon] = useState("");
  const [ingat, setIngat] = useState(true);
  const kotakGalat = useRef<HTMLDivElement>(null);

  // Setelah ditolak, fokus ke pesan galat supaya pembaca layar membacanya
  // dan pengguna keyboard tidak harus mencari di mana masalahnya.
  useEffect(() => {
    if (state && !state.sukses) kotakGalat.current?.focus();
  }, [state]);

  return (
    <form action={action} className="space-y-5" noValidate>
      {ke && <input type="hidden" name="ke" value={ke} />}
      <input type="hidden" name="ingatDikirim" value="1" />

      {state?.pesan && (
        <div ref={kotakGalat} tabIndex={-1} role="alert" className="kotak-galat focus:outline-none">
          {state.pesan}
        </div>
      )}

      <InputTelepon
        id="telepon"
        name="telepon"
        label={dapur ? "Nomor HP akun dapur" : "Nomor HP / WhatsApp"}
        nilai={telepon}
        onNilai={setTelepon}
        error={state?.kesalahan?.telepon?.[0]}
        required
        autoFocus
      />

      <InputSandi
        id="sandi"
        name="sandi"
        label="Kata sandi"
        required
        error={state?.kesalahan?.sandi?.[0]}
        tautanLabel={
          <Link href="/lupa-sandi" className="text-[14px] font-semibold text-pandan-tua hover:underline underline-offset-2">
            Lupa kata sandi?
          </Link>
        }
      />

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          name="ingat"
          value="1"
          checked={ingat}
          onChange={(e) => setIngat(e.target.checked)}
          className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[var(--color-pandan)] cursor-pointer"
        />
        <span className="text-[15px] leading-snug">
          <span className="font-semibold text-arang">Ingat saya di perangkat ini</span>
          <span className="block text-[13px] text-arang-sedang">
            {ingat ? "Tetap masuk selama 30 hari." : "Keluar otomatis saat peramban ditutup — pilih ini di HP pinjaman."}
          </span>
        </span>
      </label>

      <button type="submit" disabled={isPending} aria-busy={isPending} className="tombol-utama tombol-besar w-full">
        {isPending ? (
          <>
            <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white anim-putar-cepat" />
            Memeriksa…
          </>
        ) : dapur ? (
          "Masuk ke dashboard"
        ) : (
          "Masuk"
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[13px] text-arang-sedang">
        <IkonKunci className="w-3.5 h-3.5" />
        Koneksi terenkripsi. Dapur tidak pernah menanyakan kata sandimu.
      </p>
    </form>
  );
}
