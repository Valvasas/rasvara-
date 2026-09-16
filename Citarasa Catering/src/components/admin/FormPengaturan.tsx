"use client";

import { useActionState } from "react";
import { aksiSimpanPengaturan } from "@/app/aksi/pengaturan";
import type { Pengaturan } from "@/generated/prisma/client";

export function FormPengaturan({ awal }: { awal: Pengaturan }) {
  const [state, action, isPending] = useActionState(aksiSimpanPengaturan, null);

  return (
    <form action={action} className="permukaan-kartu p-6 sm:p-8 rounded-3xl space-y-6">
      {state?.pesan && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold text-center ${
            state.sukses
              ? "bg-daun-lembut text-daun-tua border border-daun/30"
              : "bg-bahaya-lembut text-bahaya border border-bahaya/30"
          }`}
        >
          {state.pesan}
        </div>
      )}

      {/* Bagian 1: Identitas Usaha */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-kayu border-b border-krem-gelap pb-2">
          1. Profil Usaha
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Nama Usaha Catering
            </label>
            <input
              type="text"
              name="namaUsaha"
              required
              defaultValue={awal.namaUsaha}
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Nomor WhatsApp Dapur
            </label>
            <input
              type="tel"
              name="whatsapp"
              defaultValue={awal.whatsapp}
              placeholder="Contoh: 081234567890"
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
            Tagline / Slogan
          </label>
          <input
            type="text"
            name="tagline"
            defaultValue={awal.tagline}
            placeholder="Contoh: Masakan hangat, siap tepat waktu."
            className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
            Alamat Dapur / Lokasi Pengambilan
          </label>
          <textarea
            name="alamat"
            rows={2}
            defaultValue={awal.alamat}
            placeholder="Alamat lengkap lokasi dapur..."
            className="w-full p-3 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
          />
        </div>
      </div>

      {/* Bagian 2: Jam Operasional & Pengantaran */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-kayu border-b border-krem-gelap pb-2">
          2. Jam Dapur & Biaya Antar
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Jam Buka Dapur (WIB)
            </label>
            <input
              type="time"
              name="jamBuka"
              required
              defaultValue={awal.jamBuka}
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Jam Tutup Dapur (WIB)
            </label>
            <input
              type="time"
              name="jamTutup"
              required
              defaultValue={awal.jamTutup}
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Ongkir Default (Rp)
            </label>
            <input
              type="number"
              name="ongkirDefault"
              step="1000"
              defaultValue={awal.ongkirDefault}
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Min. Order Gratis Ongkir (Rp)
            </label>
            <input
              type="number"
              name="minOrderAntar"
              step="10000"
              defaultValue={awal.minOrderAntar}
              placeholder="0 jika tidak ada promo gratis ongkir"
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>
        </div>
      </div>

      {/* Bagian 3: Rekening Bank */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-kayu border-b border-krem-gelap pb-2">
          3. Rekening Penerimaan Pembayaran
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Nama Bank
            </label>
            <input
              type="text"
              name="namaBank"
              defaultValue={awal.namaBank}
              placeholder="BCA / BRI / Mandiri"
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Nomor Rekening
            </label>
            <input
              type="text"
              name="nomorRekening"
              defaultValue={awal.nomorRekening}
              placeholder="1234567890"
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm font-mono focus:outline-none focus:border-bata"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1">
              Atas Nama Rekening
            </label>
            <input
              type="text"
              name="namaRekening"
              defaultValue={awal.namaRekening}
              placeholder="Nama Pemilik Rekening"
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-krem-gelap bg-krem/30 text-kayu text-sm focus:outline-none focus:border-bata"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[50px] px-6 py-3 rounded-2xl font-bold text-sm text-white bg-bata hover:bg-bata-tua disabled:opacity-50 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
      >
        {isPending ? "Menyimpan..." : "Simpan Pengaturan Usaha"}
      </button>
    </form>
  );
}

