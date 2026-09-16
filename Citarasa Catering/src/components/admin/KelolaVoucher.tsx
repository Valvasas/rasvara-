"use client";

import { useActionState, useState, useTransition } from "react";
import { KartuVoucher, type StatusVoucher } from "@/components/KartuVoucher";
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
        className="permukaan-kartu rounded-3xl overflow-hidden"
      >
        <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap">
          <h2 className="judul-bagian text-sm text-kayu">Buat Voucher Baru</h2>
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
      <div className="permukaan-kartu rounded-3xl overflow-hidden">
        <div className="p-4 bg-krem-tua/60 border-b border-krem-gelap flex items-center justify-between">
          <h2 className="judul-bagian text-sm text-kayu">Daftar Voucher</h2>
          <span className="text-xs font-semibold text-kayu-sedang">
            {daftar.length} voucher
          </span>
        </div>

        {daftar.length === 0 ? (
          // Keadaan kosong digambarkan sebagai tiket bergaris putus-putus:
          // bentuk yang akan muncul begitu voucher pertama dibuat, sehingga
          // ruang kosong ini menjelaskan dirinya sendiri.
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="tiket-tegak flex w-full max-w-md opacity-55">
              <div className="shrink-0 w-[132px] bg-krem-tua/70 flex items-center justify-center py-7">
                <span className="judul-utama text-3xl text-kayu-sedang/50">
                  %
                </span>
              </div>
              <div className="garis-sobek" />
              <div className="flex-1 bg-krem-tua/40 px-4 py-7 flex flex-col justify-center gap-2">
                <span className="h-2.5 w-28 rounded-full bg-krem-gelap/80" />
                <span className="h-2 w-40 rounded-full bg-krem-gelap/60" />
              </div>
            </div>
            <p className="text-sm text-kayu-sedang max-w-sm">
              Belum ada voucher. Buat satu di formulir di atas — kodenya bisa
              langsung disebar ke grup WhatsApp pelanggan.
            </p>
          </div>
        ) : (
          // Latar krem supaya takik tiket benar-benar terlihat berlubang; di
          // atas latar putih, lubangnya tembus ke putih juga dan hilang.
          <ul className="bg-krem-tua/55 p-4 space-y-3">
            {daftar.map((v) => {
              const habis = v.kuota !== null && v.terpakai >= v.kuota;
              const kedaluwarsa = v.berakhirPada
                ? new Date(v.berakhirPada) < new Date()
                : false;

              const status: StatusVoucher = !v.aktif
                ? "NONAKTIF"
                : kedaluwarsa
                  ? "KEDALUWARSA"
                  : habis
                    ? "HABIS"
                    : "BERJALAN";

              return (
                <li key={v.id}>
                  <KartuVoucher
                    kode={v.kode}
                    jenis={v.jenis}
                    nilai={v.nilai}
                    maksPotongan={v.maksPotongan}
                    minBelanja={v.minBelanja}
                    kuota={v.kuota}
                    terpakai={v.terpakai}
                    berakhirPada={v.berakhirPada}
                    deskripsi={v.deskripsi}
                    status={status}
                    aksi={
                      <>
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
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
