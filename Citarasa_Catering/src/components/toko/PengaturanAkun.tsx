"use client";

import { useActionState, useEffect, useState } from "react";
import { aksiUbahProfil } from "@/app/aksi/auth";
import { IkonUkuranTeks } from "@/components/ikon/Ikon";

/**
 * Sakelar "Teks besar". Banyak pembeli katering adalah orang tua yang memesan
 * untuk arisan atau pengajian; ukuran huruf bawaan ponsel sering tidak cukup.
 * Pilihan disimpan di perangkat (localStorage) dan diterapkan sebelum halaman
 * dilukis oleh skrip kecil di layout akar, jadi tidak ada kedipan.
 */
export function SakelarTeks({ ringkas = false }: { ringkas?: boolean }) {
  const [besar, setBesar] = useState(false);
  useEffect(() => {
    setBesar(document.documentElement.dataset.teks === "besar");
  }, []);

  const pilih = (nilai: boolean) => {
    setBesar(nilai);
    if (nilai) document.documentElement.dataset.teks = "besar";
    else delete document.documentElement.dataset.teks;
    try {
      if (nilai) localStorage.setItem("citarasa:teks", "besar");
      else localStorage.removeItem("citarasa:teks");
    } catch {
      // Penyimpanan diblokir: pilihan tetap berlaku selama tab terbuka.
    }
  };

  const tombol = (
    <div role="group" aria-label="Ukuran tulisan" className="inline-flex rounded-xl border-[1.5px] border-krem-gelap bg-krem-tua p-1">
      {[
        { nilai: false, label: "Normal", kelas: "text-[15px]" },
        { nilai: true, label: "Besar", kelas: "text-[18px]" },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => pilih(o.nilai)}
          aria-pressed={besar === o.nilai}
          className={`min-h-[40px] px-4 rounded-lg font-semibold cursor-pointer transition-colors ${o.kelas} ${
            besar === o.nilai ? "bg-white text-kayu shadow-sm" : "text-kayu-sedang hover:text-kayu"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  if (ringkas) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-kayu">
          <IkonUkuranTeks className="w-5 h-5" />
          Ukuran tulisan
        </span>
        {tombol}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-kunyit-lembut text-kunyit-tua flex items-center justify-center">
          <IkonUkuranTeks className="w-5 h-5" />
        </span>
        <div>
          <p className="font-semibold text-kayu">Ukuran tulisan</p>
          <p className="text-[13px] text-kayu-sedang">Perbesar bila tulisan terasa kecil</p>
        </div>
      </div>
      {tombol}
    </div>
  );
}

export function FormProfil({ nama: namaAwal, alamat: alamatAwal }: { nama: string; alamat: string }) {
  const [state, action, isPending] = useActionState(aksiUbahProfil, null);
  const [nama, setNama] = useState(namaAwal);
  const [alamat, setAlamat] = useState(alamatAwal);
  const galat = state?.kesalahan ?? {};

  return (
    <form action={action} noValidate className="space-y-4">
      {state?.pesan && (
        <p role={state.sukses ? "status" : "alert"} className={state.sukses ? "kotak-sukses" : "kotak-galat"}>
          {state.pesan}
        </p>
      )}
      <div>
        <label htmlFor="profil-nama" className="label">
          Nama
        </label>
        <input
          id="profil-nama"
          name="nama"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          aria-invalid={galat.nama ? true : undefined}
          className={`isian ${galat.nama ? "isian-galat" : ""}`}
        />
        {galat.nama && <p className="pesan-galat">{galat.nama[0]}</p>}
      </div>
      <div>
        <label htmlFor="profil-alamat" className="label">
          Alamat antar utama
        </label>
        <textarea
          id="profil-alamat"
          name="alamat"
          rows={3}
          maxLength={500}
          autoComplete="street-address"
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Otomatis terisi saat checkout"
          className="isian py-3"
        />
        {galat.alamat ? <p className="pesan-galat">{galat.alamat[0]}</p> : <p className="petunjuk">Otomatis terisi di checkout, tetap bisa diubah per pesanan.</p>}
      </div>
      <button type="submit" disabled={isPending} className="tombol-utama w-full sm:w-auto">
        {isPending ? "Menyimpan…" : "Simpan profil"}
      </button>
    </form>
  );
}
