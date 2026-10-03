"use client";

import { useActionState, useEffect, useState } from "react";
import { aksiTambahKas } from "@/app/aksi/kas";
import { KATEGORI_PEMASUKAN, KATEGORI_PENGELUARAN } from "@/lib/pesanan";

export function FormCatatKas({ hariIni }: { hariIni: string }) {
  const [state, action, isPending] = useActionState(aksiTambahKas, null);
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("KELUAR");
  const [kategori, setKategori] = useState(KATEGORI_PENGELUARAN[0]);
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [tanggal, setTanggal] = useState(hariIni);
  const g = state?.kesalahan ?? {};

  const opsiKategori = jenis === "MASUK" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;

  // Isian terkendali supaya tidak hilang saat validasi gagal; dikosongkan
  // hanya setelah tersimpan.
  useEffect(() => {
    if (state?.sukses) {
      setJumlah("");
      setKeterangan("");
    }
  }, [state]);

  const pilihJenis = (j: "MASUK" | "KELUAR") => {
    setJenis(j);
    setKategori((j === "MASUK" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN)[0]);
  };

  return (
    <form action={action} noValidate className="space-y-4">
      {state?.pesan && (
        <div role={state.sukses ? "status" : "alert"} className={state.sukses ? "kotak-sukses" : "kotak-galat"}>
          {state.pesan}
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Jenis catatan</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-krem-tua p-1">
          {(["KELUAR", "MASUK"] as const).map((j) => (
            <label
              key={j}
              className={`min-h-[40px] rounded-lg text-sm font-medium flex items-center justify-center cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bata/40 ${
                jenis === j ? "bg-white text-kayu shadow-sm" : "text-kayu-sedang hover:text-kayu"
              }`}
            >
              <input type="radio" name="jenis" value={j} checked={jenis === j} onChange={() => pilihJenis(j)} className="sr-only" />
              {j === "KELUAR" ? "Pengeluaran" : "Pemasukan"}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="kas-jumlah" className="label">Jumlah (Rp)</label>
        <input
          id="kas-jumlah"
          type="number"
          name="jumlah"
          inputMode="numeric"
          min={1}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="150000"
          aria-invalid={g.jumlah ? true : undefined}
          className={`isian angka-tabel ${g.jumlah ? "isian-galat" : ""}`}
        />
        {g.jumlah && <p className="pesan-galat">{g.jumlah[0]}</p>}
      </div>

      <div>
        <label htmlFor="kas-keterangan" className="label">Keterangan</label>
        <input
          id="kas-keterangan"
          type="text"
          name="keterangan"
          maxLength={200}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder={jenis === "KELUAR" ? "Belanja bumbu di pasar" : "Jual sisa snack box"}
          aria-invalid={g.keterangan ? true : undefined}
          className={`isian ${g.keterangan ? "isian-galat" : ""}`}
        />
        {g.keterangan && <p className="pesan-galat">{g.keterangan[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="kas-kategori" className="label">Kategori</label>
          <select id="kas-kategori" name="kategori" value={kategori} onChange={(e) => setKategori(e.target.value)} className="isian">
            {opsiKategori.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="kas-tanggal" className="label">Tanggal</label>
          <input id="kas-tanggal" type="date" name="tanggal" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="isian" />
        </div>
      </div>

      <button type="submit" disabled={isPending} className="tombol-utama w-full">
        {isPending ? "Menyimpan..." : "Simpan catatan"}
      </button>
    </form>
  );
}
