"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { aksiDaftar } from "@/app/aksi/auth";
import { InputSandi } from "@/components/InputSandi";
import { InputTelepon } from "@/components/InputTelepon";
import { IkonCek } from "@/components/ikon/Ikon";
import { normalkanTelepon } from "@/lib/format";

/** Syarat sandi yang ditampilkan hidup saat mengetik — jauh lebih ramah daripada galat setelah kirim. */
const SYARAT = [
  { label: "Minimal 8 karakter", cek: (s: string) => s.length >= 8 },
  { label: "Ada angka", cek: (s: string) => /\d/.test(s) },
  {
    label: "Bukan nomor HP-mu",
    // Sama dengan aturan server: "0812…" dan "812…" dianggap nomor yang sama.
    cek: (s: string, hp: string) => s.length > 0 && (!hp || normalkanTelepon(s.replace(/\D/g, "")) !== normalkanTelepon(hp)),
  },
];

export function FormDaftar({ ke }: { ke?: string }) {
  const [state, action, isPending] = useActionState(aksiDaftar, null);
  // Terkendali supaya isian tidak hilang saat pendaftaran ditolak.
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [sandi, setSandi] = useState("");
  const galat = state?.kesalahan ?? {};
  const kotakGalat = useRef<HTMLDivElement>(null);
  const terpenuhi = SYARAT.filter((s) => s.cek(sandi, telepon)).length;

  useEffect(() => {
    if (state && !state.sukses) kotakGalat.current?.focus();
  }, [state]);

  return (
    <form action={action} noValidate className="space-y-5">
      {ke && <input type="hidden" name="ke" value={ke} />}
      {state?.pesan && (
        <div ref={kotakGalat} tabIndex={-1} role="alert" className="kotak-galat focus:outline-none">
          {state.pesan}
          {/sudah terdaftar/i.test(state.pesan) && (
            <a href="/masuk" className="ml-1 font-bold underline underline-offset-2">
              Masuk sekarang
            </a>
          )}
        </div>
      )}

      <div>
        <label htmlFor="nama" className="label">
          Nama
        </label>
        <input
          type="text"
          id="nama"
          name="nama"
          required
          maxLength={100}
          autoComplete="name"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Mis. Ibu Ratna"
          aria-invalid={galat.nama ? true : undefined}
          className={`isian ${galat.nama ? "isian-galat" : ""}`}
        />
        {galat.nama && <p className="pesan-galat">{galat.nama[0]}</p>}
      </div>

      <InputTelepon
        id="telepon"
        name="telepon"
        label="Nomor WhatsApp"
        nilai={telepon}
        onNilai={setTelepon}
        error={galat.telepon?.[0]}
        petunjuk="Jadi nomor masuk & tempat dapur mengirim kabar pesanan."
        required
      />

      <div>
        <InputSandi
          id="sandi"
          name="sandi"
          label="Buat kata sandi"
          autoComplete="new-password"
          minLength={8}
          required
          error={galat.sandi?.[0]}
          onNilai={setSandi}
          describedBy="syarat-sandi"
        />
        {/* Meter kekuatan 3 ruas: tiap syarat yang terpenuhi mengisi satu ruas */}
        <div aria-hidden="true" className="mt-2.5 grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-colors duration-300 ${
                i < terpenuhi ? (terpenuhi === 3 ? "bg-pandan" : "bg-kunyit") : "bg-beras-tua"
              }`}
            />
          ))}
        </div>
        <ul id="syarat-sandi" className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {SYARAT.map((s) => {
            const ok = s.cek(sandi, telepon);
            return (
              <li key={s.label} className={`flex items-center gap-1.5 text-[13px] transition-colors ${ok ? "text-pandan-tua font-semibold" : "text-arang-sedang"}`}>
                <span
                  aria-hidden="true"
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${ok ? "bg-pandan text-white" : "border border-beras-gelap"}`}
                >
                  {ok && <IkonCek className="w-2.5 h-2.5" strokeWidth={4} />}
                </span>
                {s.label}
                <span className="sr-only">{ok ? "(terpenuhi)" : "(belum)"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label htmlFor="alamat" className="label">
          Alamat antar <span className="font-normal text-arang-sedang">(boleh nanti)</span>
        </label>
        <textarea
          id="alamat"
          name="alamat"
          rows={2}
          maxLength={500}
          autoComplete="street-address"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          className="isian py-3"
        />
      </div>

      <button type="submit" disabled={isPending} aria-busy={isPending} className="tombol-utama tombol-besar w-full">
        {isPending ? (
          <>
            <span aria-hidden="true" className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white anim-putar-cepat" />
            Membuat akun…
          </>
        ) : (
          "Buat akun gratis"
        )}
      </button>
      <p className="text-center text-[13px] text-arang-sedang">
        Dengan mendaftar, kamu menyetujui{" "}
        <a href="/syarat-ketentuan" className="underline hover:text-arang">
          syarat
        </a>{" "}
        &amp;{" "}
        <a href="/kebijakan-privasi" className="underline hover:text-arang">
          kebijakan privasi
        </a>
        .
      </p>
    </form>
  );
}
