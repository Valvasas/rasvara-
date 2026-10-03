"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";
import { aksiSimpanBahan } from "@/app/aksi/bahan";
import { SATUAN_BAHAN } from "@/lib/bahan-tipe";

/** Tambah bahan baru. Dikirim lewat onSubmit supaya isian tidak hilang saat ditolak. */
export function FormBahan() {
  const [state, action, isPending] = useActionState(aksiSimpanBahan, null);
  const [, mulai] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const g = state?.kesalahan ?? {};

  useEffect(() => {
    if (state?.sukses) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("#bahan-nama")?.focus();
    }
  }, [state]);

  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mulai(() => action(fd));
  };

  return (
    <form ref={ref} onSubmit={kirim} noValidate className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
      <div>
        <label htmlFor="bahan-nama" className="label">Nama bahan</label>
        <input id="bahan-nama" name="nama" type="text" maxLength={60} placeholder="Ayam potong" className={`isian ${g.nama ? "isian-galat" : ""}`} />
        {g.nama && <p className="pesan-galat">{g.nama[0]}</p>}
      </div>
      <div>
        <label htmlFor="bahan-satuan" className="label">Satuan</label>
        <input id="bahan-satuan" name="satuan" type="text" list="pilihan-satuan" maxLength={15} placeholder="kg" className={`isian ${g.satuan ? "isian-galat" : ""}`} />
        <datalist id="pilihan-satuan">
          {SATUAN_BAHAN.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {g.satuan && <p className="pesan-galat">{g.satuan[0]}</p>}
      </div>
      <div>
        <label htmlFor="bahan-harga" className="label">Harga / satuan (Rp)</label>
        <input id="bahan-harga" name="hargaPerSatuan" type="number" inputMode="numeric" min={0} placeholder="38000" className={`isian angka-tabel ${g.hargaPerSatuan ? "isian-galat" : ""}`} />
        {g.hargaPerSatuan && <p className="pesan-galat">{g.hargaPerSatuan[0]}</p>}
      </div>
      <button type="submit" disabled={isPending} className="tombol-utama">
        {isPending ? "Menyimpan..." : "Tambah"}
      </button>
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={`sm:col-span-4 text-sm ${state.sukses ? "text-daun-tua" : "text-bahaya"}`}>
          {state.pesan}
        </p>
      )}
    </form>
  );
}
