"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { aksiHapusStaf, aksiTambahStaf, type HasilAksiStaf } from "@/app/aksi/staf";
import { tanggalPendek, teleponTampil } from "@/lib/format";
import { InputSandi } from "@/components/InputSandi";

export type StafItem = {
  id: string;
  nama: string;
  telepon: string;
  dibuatPada: Date;
};

/**
 * Akun staf dapur: hanya melihat papan pesanan dan memajukan status — tanpa
 * akses kas, omzet, menu, maupun pengaturan.
 */
export function DaftarStafDapur({ daftarAwal }: { daftarAwal: StafItem[] }) {
  const [state, formAction, sedangProses] = useActionState<HasilAksiStaf | null, FormData>(aksiTambahStaf, null);
  const [, mulaiKirim] = useTransition();
  const [sedangHapus, mulaiHapus] = useTransition();
  const [akanDihapus, setAkanDihapus] = useState<string | null>(null);
  const [bukaForm, setBukaForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const g = state?.kesalahan ?? {};

  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setBukaForm(false);
    }
  }, [state]);

  // onSubmit (bukan atribut action) supaya isian tidak dikosongkan React saat ditolak.
  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    mulaiKirim(() => formAction(data));
  };

  const hapus = (id: string) => {
    if (akanDihapus !== id) {
      setAkanDihapus(id);
      return;
    }
    mulaiHapus(async () => {
      await aksiHapusStaf(id);
      setAkanDihapus(null);
    });
  };

  return (
    <div className="space-y-4">
      {state?.sukses && state.pesan && !bukaForm && <p role="status" className="kotak-sukses">{state.pesan}</p>}

      {daftarAwal.length === 0 ? (
        <p className="teks-redup">Belum ada staf. Staf hanya bisa melihat papan pesanan dan memajukan status masakan.</p>
      ) : (
        <ul className="divide-y divide-krem-gelap border-y border-krem-gelap">
          {daftarAwal.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-kayu">{s.nama}</p>
                <p className="text-xs text-kayu-sedang">
                  {teleponTampil(s.telepon)} · sejak {tanggalPendek(s.dibuatPada)}
                </p>
              </div>
              <span className="flex gap-1">
                {akanDihapus === s.id && !sedangHapus && (
                  <button type="button" onClick={() => setAkanDihapus(null)} className="tombol-hantu tombol-kecil">Batal</button>
                )}
                <button
                  type="button"
                  disabled={sedangHapus}
                  onClick={() => hapus(s.id)}
                  className={`tombol tombol-kecil ${akanDihapus === s.id ? "bg-bahaya text-white" : "text-bahaya hover:bg-bahaya-lembut"}`}
                >
                  {akanDihapus === s.id ? (sedangHapus ? "Mencabut..." : "Cabut akses?") : "Cabut akses"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {bukaForm ? (
        <form ref={formRef} onSubmit={kirim} noValidate className="rounded-xl border border-krem-gelap p-4 space-y-4">
          {state && !state.sukses && state.pesan && <div role="alert" className="kotak-galat">{state.pesan}</div>}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="staf-nama" className="label">Nama</label>
              <input id="staf-nama" name="nama" type="text" maxLength={80} className={`isian ${g.nama ? "isian-galat" : ""}`} />
              {g.nama && <p className="pesan-galat">{g.nama[0]}</p>}
            </div>
            <div>
              <label htmlFor="staf-telepon" className="label">Nomor HP (untuk masuk)</label>
              <input id="staf-telepon" name="telepon" type="tel" inputMode="tel" maxLength={20} className={`isian ${g.telepon ? "isian-galat" : ""}`} />
              {g.telepon && <p className="pesan-galat">{g.telepon[0]}</p>}
            </div>
            <InputSandi id="staf-sandi" name="sandi" label="Kata sandi awal" autoComplete="new-password" minLength={8} error={g.sandi?.[0]} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={sedangProses} className="tombol-utama">
              {sedangProses ? "Menyimpan..." : "Tambah staf"}
            </button>
            <button type="button" onClick={() => setBukaForm(false)} className="tombol-hantu">Batal</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setBukaForm(true)} className="tombol-kedua">
          Tambah staf dapur
        </button>
      )}
    </div>
  );
}
