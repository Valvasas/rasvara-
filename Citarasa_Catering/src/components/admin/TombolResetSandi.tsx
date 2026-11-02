"use client";

import { useActionState, useState } from "react";
import { aksiResetSandiPelanggan } from "@/app/aksi/pelanggan";
import { TombolSalin } from "@/components/TombolSalin";
import { IkonKunci, IkonWhatsapp } from "@/components/ikon/Ikon";
import { linkWhatsapp, namaPanggilan } from "@/lib/format";

/**
 * Reset sandi pelanggan, dua langkah di tempat. Setelah berhasil, sandi
 * sementara tampil SEKALI di sini beserta tombol kirim ke nomor terdaftar.
 */
export function TombolResetSandi({ penggunaId, nama, namaUsaha }: { penggunaId: string; nama: string; namaUsaha: string }) {
  const [state, action, isPending] = useActionState(aksiResetSandiPelanggan, null);
  const [yakin, setYakin] = useState(false);

  if (state?.sukses) {
    const pesan =
      `Halo ${namaPanggilan(state.nama)}, ini kata sandi sementara akun ${namaUsaha}:\n\n${state.sandiSementara}\n\n` +
      `Masuk dengan nomor ini, lalu segera ganti sandinya di menu Akun → Keamanan. Jangan bagikan sandi ini ke siapa pun.`;
    return (
      <div className="rounded-[10px] border border-pandan/25 bg-pandan-lembut p-3 space-y-2.5 min-w-[15rem]">
        <p className="text-[13px] font-semibold text-pandan-tua">Sandi sementara (tampil sekali):</p>
        <p className="font-presisi text-[15px] font-bold text-arang break-all select-all">{state.sandiSementara}</p>
        <div className="flex flex-wrap gap-2">
          <TombolSalin teks={state.sandiSementara} className="tombol-kecil" />
          <a
            href={linkWhatsapp(state.telepon, pesan)}
            target="_blank"
            rel="noopener noreferrer"
            className="tombol-utama tombol-kecil"
          >
            <IkonWhatsapp className="w-4 h-4" />
            Kirim ke nomor terdaftar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      {yakin ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="penggunaId" value={penggunaId} />
          <span className="text-[13px] text-arang-sedang">Sesi {nama.split(" ")[0]} di semua perangkat akan berakhir.</span>
          <button type="button" onClick={() => setYakin(false)} className="tombol-hantu tombol-kecil">
            Batal
          </button>
          <button type="submit" disabled={isPending} className="tombol-bahaya tombol-kecil">
            {isPending ? "Membuat…" : "Ya, reset"}
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setYakin(true)} className="tombol-kedua tombol-kecil">
          <IkonKunci className="w-4 h-4" />
          Reset sandi
        </button>
      )}
      {state && !state.sukses && (
        <p role="alert" className="pesan-galat !mt-0">
          {state.pesan}
        </p>
      )}
    </div>
  );
}
