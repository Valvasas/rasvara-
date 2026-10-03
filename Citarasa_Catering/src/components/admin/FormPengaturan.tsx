"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { aksiSimpanPengaturan } from "@/app/aksi/pengaturan";
import type { Pengaturan } from "@/generated/prisma/client";

/** 6281234567890 -> 081234567890, bentuk yang biasa diketik pemilik. */
const keLokal = (nomor: string) => (nomor.startsWith("62") ? `0${nomor.slice(2)}` : nomor);

export function FormPengaturan({ awal }: { awal: Pengaturan }) {
  const [state, action, isPending] = useActionState(aksiSimpanPengaturan, null);
  const [, mulai] = useTransition();
  const g = state?.kesalahan ?? {};

  // Lewat onSubmit supaya isian yang baru diketik tidak dikembalikan ke nilai
  // lama oleh React saat server menolak salah satu isian.
  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    mulai(() => action(data));
  };

  const kelas = (k: string) => `isian ${g[k] ? "isian-galat" : ""}`;
  const Galat = ({ k }: { k: string }) => (g[k] ? <p className="pesan-galat">{g[k][0]}</p> : null);

  return (
    <form onSubmit={kirim} noValidate className="space-y-6">
      <section aria-labelledby="judul-profil" className="kartu kartu-isi">
        <h2 id="judul-profil" className="judul-bagian">Profil usaha</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="namaUsaha" className="label">Nama usaha</label>
            <input id="namaUsaha" name="namaUsaha" type="text" maxLength={80} required defaultValue={awal.namaUsaha} className={kelas("namaUsaha")} />
            <Galat k="namaUsaha" />
          </div>
          <div>
            <label htmlFor="whatsapp" className="label">WhatsApp dapur</label>
            <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" maxLength={20} defaultValue={keLokal(awal.whatsapp)} placeholder="08xxxxxxxxxx" className={kelas("whatsapp")} />
            {g.whatsapp ? <Galat k="whatsapp" /> : <p className="petunjuk">Tombol chat di toko mengarah ke nomor ini.</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tagline" className="label">Tagline</label>
            <input id="tagline" name="tagline" type="text" maxLength={160} defaultValue={awal.tagline} className={kelas("tagline")} />
            <Galat k="tagline" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="alamat" className="label">Alamat dapur</label>
            <textarea id="alamat" name="alamat" rows={2} maxLength={300} defaultValue={awal.alamat} className={`${kelas("alamat")} py-2.5`} />
            {g.alamat ? <Galat k="alamat" /> : <p className="petunjuk">Ditampilkan untuk pembeli yang ambil sendiri.</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="judul-operasional" className="kartu kartu-isi">
        <h2 id="judul-operasional" className="judul-bagian">Jam & ongkir</h2>
        <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="jamBuka" className="label">Dapur buka</label>
            <input id="jamBuka" name="jamBuka" type="time" required defaultValue={awal.jamBuka} className={kelas("jamBuka")} />
            <Galat k="jamBuka" />
          </div>
          <div>
            <label htmlFor="jamTutup" className="label">Dapur tutup</label>
            <input id="jamTutup" name="jamTutup" type="time" required defaultValue={awal.jamTutup} className={kelas("jamTutup")} />
            <Galat k="jamTutup" />
          </div>
          <div>
            <label htmlFor="ongkirDefault" className="label">Ongkir (Rp)</label>
            <input id="ongkirDefault" name="ongkirDefault" type="number" inputMode="numeric" min={0} defaultValue={awal.ongkirDefault} className={kelas("ongkirDefault")} />
            <Galat k="ongkirDefault" />
          </div>
          <div>
            <label htmlFor="minOrderAntar" className="label">Gratis ongkir mulai</label>
            <input id="minOrderAntar" name="minOrderAntar" type="number" inputMode="numeric" min={0} defaultValue={awal.minOrderAntar} className={kelas("minOrderAntar")} />
            {g.minOrderAntar ? <Galat k="minOrderAntar" /> : <p className="petunjuk">0 = tidak ada</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="judul-rekening" className="kartu kartu-isi">
        <h2 id="judul-rekening" className="judul-bagian">Rekening transfer</h2>
        <p className="teks-redup mt-1">Bila belum lengkap, pembeli hanya bisa memilih bayar tunai.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="namaBank" className="label">Bank</label>
            <input id="namaBank" name="namaBank" type="text" maxLength={40} defaultValue={awal.namaBank} placeholder="BCA" className={kelas("namaBank")} />
            <Galat k="namaBank" />
          </div>
          <div>
            <label htmlFor="nomorRekening" className="label">Nomor rekening</label>
            <input id="nomorRekening" name="nomorRekening" type="text" inputMode="numeric" maxLength={30} defaultValue={awal.nomorRekening} className={`${kelas("nomorRekening")} font-mono`} />
            <Galat k="nomorRekening" />
          </div>
          <div>
            <label htmlFor="namaRekening" className="label">Atas nama</label>
            <input id="namaRekening" name="namaRekening" type="text" maxLength={80} defaultValue={awal.namaRekening} className={kelas("namaRekening")} />
            <Galat k="namaRekening" />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={isPending} className="tombol-utama">
          {isPending ? "Menyimpan..." : "Simpan pengaturan"}
        </button>
        {state?.pesan && (
          <p role={state.sukses ? "status" : "alert"} className={`text-sm ${state.sukses ? "text-daun-tua" : "text-bahaya"}`}>
            {state.pesan}
          </p>
        )}
      </div>
    </form>
  );
}
