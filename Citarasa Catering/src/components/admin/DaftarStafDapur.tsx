"use client";

import { useActionState, useState, useTransition } from "react";
import { aksiHapusStaf, aksiTambahStaf, type HasilAksiStaf } from "@/app/aksi/staf";
import { tanggalPendek, teleponTampil } from "@/lib/format";

export type StafItem = {
  id: string;
  nama: string;
  telepon: string;
  dibuatPada: Date;
};

export function DaftarStafDapur({ daftarAwal }: { daftarAwal: StafItem[] }) {
  const [state, formAction, sedangProses] = useActionState<HasilAksiStaf | null, FormData>(
    aksiTambahStaf,
    null
  );
  const [sedangHapus, startTransition] = useTransition();
  const [idDihapus, setIdDihapus] = useState<string | null>(null);
  const [bukaForm, setBukaForm] = useState(false);

  const handleHapus = (staf: StafItem) => {
    if (confirm(`Yakin ingin menghapus akses staf dapur "${staf.nama}"?`)) {
      setIdDihapus(staf.id);
      startTransition(async () => {
        await aksiHapusStaf(staf.id);
        setIdDihapus(null);
      });
    }
  };

  return (
    <div className="permukaan-kartu p-6 rounded-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-krem-gelap/60 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-kayu flex items-center gap-2">
            <span>👨‍🍳</span> Staf Dapur ({daftarAwal.length})
          </h2>
          <p className="text-xs text-kayu-sedang mt-0.5">
            Staf dapur hanya dapat melihat papan pesanan dan mengubah status masak. Akses buku kas, omzet, dan menu dibatasi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setBukaForm(!bukaForm)}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-bata text-white hover:bg-bata-tua transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>{bukaForm ? "Tutup Formulir" : "+ Tambah Staf Dapur"}</span>
        </button>
      </div>

      {/* Form Tambah Staf Baru */}
      {bukaForm && (
        <form
          action={async (formData) => {
            await formAction(formData);
            if (state?.sukses) {
              setBukaForm(false);
            }
          }}
          className="p-4 bg-krem/40 rounded-2xl border border-krem-gelap space-y-4"
        >
          <h3 className="judul-bagian text-sm text-kayu">Daftarkan Akun Staf Baru</h3>

          {state?.pesan && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                state.sukses
                  ? "bg-daun-lembut text-daun-tua border border-daun/40"
                  : "bg-bahaya-lembut text-bahaya border border-bahaya/40"
              }`}
            >
              {state.pesan}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-kayu mb-1">
                Nama Staf
              </label>
              <input
                type="text"
                name="nama"
                required
                placeholder="mis. Budi Koki"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-krem-gelap text-xs focus:outline-none focus:border-bata bg-white"
              />
              {state?.kesalahan?.nama && (
                <p className="text-[11px] text-bahaya mt-1">
                  {state.kesalahan.nama[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-kayu mb-1">
                Nomor WhatsApp / HP (Login)
              </label>
              <input
                type="tel"
                name="telepon"
                required
                placeholder="081234567890"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-krem-gelap text-xs focus:outline-none focus:border-bata bg-white font-mono"
              />
              {state?.kesalahan?.telepon && (
                <p className="text-[11px] text-bahaya mt-1">
                  {state.kesalahan.telepon[0]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-kayu mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                name="sandi"
                required
                placeholder="Minimal 6 karakter"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-krem-gelap text-xs focus:outline-none focus:border-bata bg-white"
              />
              {state?.kesalahan?.sandi && (
                <p className="text-[11px] text-bahaya mt-1">
                  {state.kesalahan.sandi[0]}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBukaForm(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-kayu-sedang hover:bg-white border border-krem-gelap transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={sedangProses}
              className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-bold bg-bata text-white hover:bg-bata-tua disabled:opacity-50 transition-colors cursor-pointer"
            >
              {sedangProses ? "Menyimpan..." : "Simpan Akun Staf"}
            </button>
          </div>
        </form>
      )}

      {/* Tabel Daftar Staf Dapur */}
      <div className="overflow-x-auto">
        {daftarAwal.length === 0 ? (
          <div className="p-8 text-center bg-krem/30 rounded-2xl border border-dashed border-krem-gelap text-xs text-kayu-sedang">
            Belum ada staf dapur yang didaftarkan. Klik tombol di atas untuk menambahkan asisten dapur Anda.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-krem-gelap text-kayu-sedang font-bold">
                <th className="py-2.5 px-3">Nama</th>
                <th className="py-2.5 px-3">No. HP (ID Login)</th>
                <th className="py-2.5 px-3">Terdaftar Sejak</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-krem-gelap/50">
              {daftarAwal.map((staf) => (
                <tr key={staf.id} className="hover:bg-krem/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-kayu flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-kayu text-krem text-[10px] flex items-center justify-center font-bold">
                      {staf.nama.charAt(0).toUpperCase()}
                    </span>
                    <span>{staf.nama}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-kayu">
                    {teleponTampil(staf.telepon)}
                  </td>
                  <td className="py-3 px-3 text-kayu-sedang">
                    {tanggalPendek(staf.dibuatPada)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      disabled={sedangHapus && idDihapus === staf.id}
                      onClick={() => handleHapus(staf)}
                      className="min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold text-bahaya bg-bahaya-lembut hover:bg-bahaya hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {sedangHapus && idDihapus === staf.id ? "Menghapus..." : "Cabut Akses"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

