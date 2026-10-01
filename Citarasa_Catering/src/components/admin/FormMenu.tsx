"use client";

import { useActionState, useState } from "react";
import { aksiSimpanMenu } from "@/app/aksi/menu";
import { LABEL_KATEGORI, URUTAN_KATEGORI } from "@/lib/pesanan";
import type { Menu } from "@/generated/prisma/client";

type NilaiMenu = Pick<
  Menu,
  "id" | "nama" | "deskripsi" | "kategori" | "harga" | "satuan" | "minPesan" | "preorderHari" | "kapasitasHarian"
>;

/** Formulir tambah/ubah menu. Semua isian terkendali agar tidak hilang saat validasi gagal. */
export function FormMenu({ menu }: { menu?: NilaiMenu }) {
  const [state, action, isPending] = useActionState(aksiSimpanMenu, null);
  const g = state?.kesalahan ?? {};

  const [nilai, setNilai] = useState({
    nama: menu?.nama ?? "",
    deskripsi: menu?.deskripsi ?? "",
    kategori: menu?.kategori ?? "NASI_KOTAK",
    harga: menu ? String(menu.harga) : "",
    satuan: menu?.satuan ?? "kotak",
    minPesan: menu ? String(menu.minPesan) : "1",
    preorderHari: menu ? String(menu.preorderHari) : "0",
    kapasitasHarian: menu?.kapasitasHarian ? String(menu.kapasitasHarian) : "",
  });
  const ubah = (k: keyof typeof nilai) => (e: { target: { value: string } }) =>
    setNilai((v) => ({ ...v, [k]: e.target.value }));

  const isian = (k: keyof typeof nilai) => ({
    id: k,
    name: k,
    value: nilai[k],
    onChange: ubah(k),
    "aria-invalid": g[k] ? true : undefined,
    className: `isian ${g[k] ? "isian-galat" : ""}`,
  });
  const Galat = ({ k }: { k: string }) => (g[k] ? <p className="pesan-galat">{g[k][0]}</p> : null);

  return (
    <form action={action} noValidate className="space-y-5">
      {menu && <input type="hidden" name="id" value={menu.id} />}

      {state?.pesan && (
        <div role={state.sukses ? "status" : "alert"} className={state.sukses ? "kotak-sukses" : "kotak-galat"}>
          {state.pesan}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="nama" className="label">Nama menu</label>
          <input type="text" maxLength={80} placeholder="Nasi Kotak Ayam Bakar" {...isian("nama")} />
          <Galat k="nama" />
        </div>
        <div>
          <label htmlFor="kategori" className="label">Kategori</label>
          <select {...isian("kategori")}>
            {URUTAN_KATEGORI.map((k) => (
              <option key={k} value={k}>{LABEL_KATEGORI[k]}</option>
            ))}
          </select>
          <Galat k="kategori" />
        </div>
      </div>

      <div>
        <label htmlFor="deskripsi" className="label">Deskripsi</label>
        <textarea rows={3} maxLength={600} placeholder="Isi box, lauk, porsi, dan cocok untuk acara apa" {...isian("deskripsi")} className={`${isian("deskripsi").className} py-2.5`} />
        <Galat k="deskripsi" />
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="harga" className="label">Harga (Rp)</label>
          <input type="number" inputMode="numeric" min={500} step={500} {...isian("harga")} />
          <Galat k="harga" />
        </div>
        <div>
          <label htmlFor="satuan" className="label">Satuan</label>
          <input type="text" maxLength={20} placeholder="kotak" {...isian("satuan")} />
          <Galat k="satuan" />
        </div>
        <div>
          <label htmlFor="minPesan" className="label">Min. pesan</label>
          <input type="number" inputMode="numeric" min={1} {...isian("minPesan")} />
          <Galat k="minPesan" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="preorderHari" className="label">Pesan H-</label>
          <input type="number" inputMode="numeric" min={0} max={30} {...isian("preorderHari")} />
          {g.preorderHari ? <Galat k="preorderHari" /> : <p className="petunjuk">0 = bisa hari ini</p>}
        </div>
      </div>

      <div className="max-w-xs">
        <label htmlFor="kapasitasHarian" className="label">
          Kuota per hari <span className="font-normal text-kayu-sedang">(opsional)</span>
        </label>
        <input type="number" inputMode="numeric" min={1} placeholder="Tanpa batas" {...isian("kapasitasHarian")} />
        {g.kapasitasHarian ? (
          <Galat k="kapasitasHarian" />
        ) : (
          <p className="petunjuk">Pesanan ditolak otomatis bila jumlah harian terlampaui.</p>
        )}
      </div>

      <button type="submit" disabled={isPending} className="tombol-utama">
        {isPending ? "Menyimpan..." : menu ? "Simpan perubahan" : "Tambah menu"}
      </button>
    </form>
  );
}
