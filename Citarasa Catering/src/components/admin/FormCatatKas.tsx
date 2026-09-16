"use client";

import { useActionState, useState } from "react";
import { aksiTambahKas } from "@/app/aksi/kas";
import {
  KATEGORI_PEMASUKAN,
  KATEGORI_PENGELUARAN,
} from "@/lib/pesanan";

export function FormCatatKas({ hariIni }: { hariIni: string }) {
  const [state, action, isPending] = useActionState(aksiTambahKas, null);
  const [jenis, setJenis] = useState<"MASUK" | "KELUAR">("KELUAR");

  const opsiKategori =
    jenis === "MASUK" ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;

  return (
    <form action={action} className="permukaan-kartu p-6 rounded-3xl space-y-4">
      <h2 className="text-base font-extrabold text-kayu">
        Catat Kas Baru
      </h2>

      {state?.pesan && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold text-center ${
            state.sukses
              ? "bg-daun-lembut text-daun-tua border border-daun/30"
              : "bg-bahaya-lembut text-bahaya border border-bahaya/30"
          }`}
        >
          {state.pesan}
        </div>
      )}

      {/* Pilihan Jenis Kas */}
      <div className="grid grid-cols-2 gap-2">
        <label
          className={`min-h-[44px] p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 ${
            jenis === "KELUAR"
              ? "bg-bahaya-lembut text-bahaya border-bahaya/40 ring-1 ring-bahaya"
              : "bg-krem/40 text-kayu-sedang border-krem-gelap"
          }`}
        >
          <input
            type="radio"
            name="jenis"
            value="KELUAR"
            checked={jenis === "KELUAR"}
            onChange={() => setJenis("KELUAR")}
            className="sr-only"
          />
          <span>🔻 Pengeluaran</span>
        </label>

        <label
          className={`min-h-[44px] p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2 ${
            jenis === "MASUK"
              ? "bg-daun-lembut text-daun-tua border-daun/40 ring-1 ring-daun"
              : "bg-krem/40 text-kayu-sedang border-krem-gelap"
          }`}
        >
          <input
            type="radio"
            name="jenis"
            value="MASUK"
            checked={jenis === "MASUK"}
            onChange={() => setJenis("MASUK")}
            className="sr-only"
          />
          <span>🔺 Pemasukan</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
            Kategori
          </label>
          <select
            name="kategori"
            required
            className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-xs focus:outline-none focus:border-bata"
          >
            {opsiKategori.map((kat) => (
              <option key={kat} value={kat}>
                {kat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
            Jumlah Rupiah (Rp)
          </label>
          <input
            type="number"
            name="jumlah"
            required
            min="1000"
            step="1000"
            placeholder="Contoh: 150000"
            className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-xs font-mono focus:outline-none focus:border-bata"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
            Tanggal
          </label>
          <input
            type="date"
            name="tanggal"
            required
            defaultValue={hariIni}
            className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-xs focus:outline-none focus:border-bata"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
            Keterangan
          </label>
          <input
            type="text"
            name="keterangan"
            required
            placeholder="Contoh: Belanja beras & bumbu pasar pagi"
            className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-xs focus:outline-none focus:border-bata"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[48px] px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-kayu hover:bg-kayu-sedang transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isPending ? "Menyimpan Catatan..." : "+ Simpan ke Buku Kas"}
      </button>
    </form>
  );
}

