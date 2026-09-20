"use client";

import { useActionState, useState, useTransition } from "react";
import { rupiah, tanggalPendek } from "@/lib/format";
import {
  aksiBuatVoucher,
  aksiHapusVoucher,
  aksiToggleVoucher,
} from "@/app/aksi/voucher";
import type { HasilKelolaVoucher } from "@/lib/voucher-tipe";

const GAYA_LABEL =
  "block text-xs font-bold uppercase tracking-wider text-kayu-sedang mb-1.5";
const GAYA_ISIAN =
  "w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-krem-gelap bg-krem/40 text-kayu text-sm focus:outline-none focus:border-bata focus:ring-1 focus:ring-bata";

export interface VoucherRingkas {
  id: string;
  kode: string;
  deskripsi: string | null;
  jenis: "NOMINAL" | "PERSEN";
  nilai: number;
  maksPotongan: number | null;
  minBelanja: number;
  kuota: number | null;
  terpakai: number;
  berakhirPada: Date | null;
  aktif: boolean;
}

export function KelolaVoucher({ daftar }: { daftar: VoucherRingkas[] }) {
  const [jenis, setJenis] = useState<"NOMINAL" | "PERSEN">("NOMINAL");
  const [state, formAction, sedangSimpan] = useActionState<
    HasilKelolaVoucher | null,
    FormData
  >(aksiBuatVoucher, null);

  const [sedangUbah, mulaiUbah] = useTransition();
  const [pesanUbah, setPesanUbah] = useState<string | null>(null);

  function toggle(id: string, aktifBaru: boolean) {
    mulaiUbah(async () => {
      const hasil = await aksiToggleVoucher(id, aktifBaru);
      setPesanUbah(hasil.pesan);
    });
  }

  function hapus(v: VoucherRingkas) {
    const pesan =
      v.terpakai > 0
        ? `Voucher ${v.kode} sudah dipakai ${v.terpakai} kali. Voucher akan dinonaktifkan (tidak dihapus) supaya nota lama tetap utuh. Lanjutkan?`
        : `Hapus voucher ${v.kode}?`;
    if (!window.confirm(pesan)) return;

    mulaiUbah(async () => {
      const hasil = await aksiHapusVoucher(v.id);
      setPesanUbah(hasil.pesan);
    });
  }

  return (
    <div className="space-y-6">
      {/* Formulir voucher baru */}
      <form
        action={formAction}
        className="bg-white rounded-3xl border border-krem-gelap shadow-sm overflow-hidden"
      >
        <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap">
          <h2 className="font-extrabold text-sm text-kayu">Buat Voucher Baru</h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="kode" className={GAYA_LABEL}>
                Kode Voucher
              </label>
              <input
                id="kode"
                name="kode"
                required
                maxLength={24}
                placeholder="HEMAT10"
                autoComplete="off"
                className={`${GAYA_ISIAN} uppercase`}
              />
              <p className="text-[11px] text-kayu-sedang mt-1">
                Huruf, angka, dan tanda hubung. Otomatis jadi huruf besar.
              </p>
            </div>

            <div>
              <label htmlFor="deskripsi" className={GAYA_LABEL}>
                Keterangan (opsional)
              </label>
              <input
                id="deskripsi"
                name="deskripsi"
                maxLength={120}
                placeholder="Promo pembukaan cabang"
                className={GAYA_ISIAN}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="jenis" className={GAYA_LABEL}>
                Jenis Potongan
              </label>
              <select
                id="jenis"
                name="jenis"
                value={jenis}
                onChange={(e) => setJenis(e.target.value as "NOMINAL" | "PERSEN")}
                className={GAYA_ISIAN}
              >
                <option value="NOMINAL">Potongan rupiah</option>
                <option value="PERSEN">Potongan persen</option>
              </select>
            </div>

            <div>
              <label htmlFor="nilai" className={GAYA_LABEL}>
                {jenis === "PERSEN" ? "Besar Persen (%)" : "Besar Potongan (Rp)"}
              </label>
              <input
                id="nilai"
                name="nilai"
                type="number"
                min={1}
                max={jenis === "PERSEN" ? 100 : undefined}
                required
                placeholder={jenis === "PERSEN" ? "10" : "15000"}
                className={GAYA_ISIAN}
              />
            </div>

            {jenis === "PERSEN" ? (
              <div>
                <label htmlFor="maksPotongan" className={GAYA_LABEL}>
                  Potongan Maksimal (Rp)
                </label>
                <input
                  id="maksPotongan"
                  name="maksPotongan"
                  type="number"
                  min={1}
                  placeholder="25000"
                  className={GAYA_ISIAN}
                />
                <p className="text-[11px] text-kayu-sedang mt-1">
                  Kosongkan bila tanpa batas.
                </p>
              </div>
            ) : (
              <div aria-hidden="true" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="minBelanja" className={GAYA_LABEL}>
                Minimal Belanja (Rp)
              </label>
              <input
                id="minBelanja"
                name="minBelanja"
                type="number"
                min={0}
                defaultValue={0}
                className={GAYA_ISIAN}
              />
            </div>

            <div>
              <label htmlFor="kuota" className={GAYA_LABEL}>
                Kuota Pemakaian
              </label>
              <input
                id="kuota"
                name="kuota"
                type="number"
                min={1}
                placeholder="Tanpa batas"
                className={GAYA_ISIAN}
              />
            </div>

            <div>
              <label htmlFor="berakhirPada" className={GAYA_LABEL}>
                Berlaku Sampai
              </label>
              <input
                id="berakhirPada"
                name="berakhirPada"
                type="date"
                className={GAYA_ISIAN}
              />
              <p className="text-[11px] text-kayu-sedang mt-1">
                Berlaku sampai akhir hari itu.
              </p>
            </div>
          </div>

          {state && (
            <p
              role="status"
              className={`text-xs font-semibold rounded-xl px-3 py-2 border ${
                state.sukses
                  ? "text-daun-tua bg-daun-lembut border-daun/20"
                  : "text-bahaya bg-bahaya-lembut border-bahaya/20"
              }`}
            >
              {state.pesan}
            </p>
          )}

          <button
            type="submit"
            disabled={sedangSimpan}
            className="min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-kayu hover:bg-kayu-sedang disabled:opacity-50 transition-colors cursor-pointer"
          >
            {sedangSimpan ? "Menyimpan..." : "Simpan Voucher"}
          </button>
        </div>
      </form>

      {pesanUbah && (
        <p
          role="status"
          className="text-xs font-semibold text-daun-tua bg-daun-lembut border border-daun/20 rounded-xl px-4 py-3"
        >
          {pesanUbah}
        </p>
      )}

      {/* Daftar voucher */}
      <div className="bg-white rounded-3xl border border-krem-gelap shadow-sm overflow-hidden">
        <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap flex items-center justify-between">
          <h2 className="font-extrabold text-sm text-kayu">Daftar Voucher</h2>
          <span className="text-xs font-semibold text-kayu-sedang">
            {daftar.length} voucher
          </span>
        </div>

        {daftar.length === 0 ? (
          <p className="p-6 text-sm text-kayu-sedang italic">
            Belum ada voucher. Buat satu di formulir atas.
          </p>
        ) : (
          <ul className="divide-y divide-krem-gelap/60">
            {daftar.map((v) => {
              const habis = v.kuota !== null && v.terpakai >= v.kuota;
              const kedaluwarsa = v.berakhirPada
                ? new Date(v.berakhirPada) < new Date()
                : false;

              return (
                <li
                  key={v.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-kayu">
                        {v.kode}
                      </span>

                      {!v.aktif && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-krem-gelap text-kayu-sedang">
                          Nonaktif
                        </span>
                      )}
                      {v.aktif && kedaluwarsa && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-bahaya-lembut text-bahaya">
                          Kedaluwarsa
                        </span>
                      )}
                      {v.aktif && !kedaluwarsa && habis && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-kunyit-lembut text-kunyit-tua">
                          Kuota habis
                        </span>
                      )}
                      {v.aktif && !kedaluwarsa && !habis && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-daun-lembut text-daun-tua">
                          Berjalan
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-kayu-sedang">
                      {v.jenis === "PERSEN"
                        ? `Potong ${v.nilai}%${v.maksPotongan ? ` (maks ${rupiah(v.maksPotongan)})` : ""}`
                        : `Potong ${rupiah(v.nilai)}`}
                      {v.minBelanja > 0 && ` • min. belanja ${rupiah(v.minBelanja)}`}
                    </p>

                    <p className="text-xs text-kayu-sedang">
                      Dipakai {v.terpakai}
                      {v.kuota !== null ? ` dari ${v.kuota}` : " kali"}
                      {v.berakhirPada &&
                        ` • sampai ${tanggalPendek(v.berakhirPada)}`}
                      {v.deskripsi && ` • ${v.deskripsi}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => toggle(v.id, !v.aktif)}
                      disabled={sedangUbah}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer ${
                        v.aktif
                          ? "bg-krem-tua text-kayu hover:bg-krem-gelap"
                          : "bg-daun text-white hover:bg-daun-tua"
                      }`}
                    >
                      {v.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>

                    <button
                      type="button"
                      onClick={() => hapus(v)}
                      disabled={sedangUbah}
                      aria-label={`Hapus voucher ${v.kode}`}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-bahaya bg-bahaya-lembut hover:bg-bahaya hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
