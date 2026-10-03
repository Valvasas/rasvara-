"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { rupiah, tanggalPendek } from "@/lib/format";
import {
  aksiBuatVoucher,
  aksiHapusVoucher,
  aksiToggleVoucher,
} from "@/app/aksi/voucher";
import type { HasilKelolaVoucher } from "@/lib/voucher-tipe";

const GAYA_LABEL = "label";
const GAYA_ISIAN = "isian";

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
  const [, mulaiKirim] = useTransition();
  const [pesanUbah, setPesanUbah] = useState<string | null>(null);
  const [akanDihapus, setAkanDihapus] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Dikirim lewat onSubmit, bukan atribut `action`, supaya React tidak
  // mengosongkan isian otomatis saat server menolak (mis. kode sudah dipakai).
  // Formulir hanya dikosongkan setelah voucher benar-benar tersimpan.
  const kirim = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    mulaiKirim(() => formAction(data));
  };
  useEffect(() => {
    if (state?.sukses) {
      formRef.current?.reset();
      setJenis("NOMINAL");
    }
  }, [state]);

  function toggle(id: string, aktifBaru: boolean) {
    mulaiUbah(async () => {
      const hasil = await aksiToggleVoucher(id, aktifBaru);
      setPesanUbah(hasil.pesan);
    });
  }

  // Konfirmasi dua langkah di tempat, menggantikan window.confirm().
  function hapus(v: VoucherRingkas) {
    if (akanDihapus !== v.id) {
      setAkanDihapus(v.id);
      return;
    }
    setAkanDihapus(null);
    mulaiUbah(async () => {
      const hasil = await aksiHapusVoucher(v.id);
      setPesanUbah(hasil.pesan);
    });
  }

  return (
    <div className="space-y-6">
      {/* Formulir voucher baru */}
      <form ref={formRef} onSubmit={kirim} noValidate className="kartu overflow-hidden">
        <div className="px-5 py-4 border-b border-krem-gelap">
          <h2 className="judul-bagian">Buat voucher</h2>
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
              <p className="petunjuk">
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
                <p className="petunjuk">
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
              <p className="petunjuk">
                Berlaku sampai akhir hari itu.
              </p>
            </div>
          </div>

          {state && (
            <p
              role="status"
              className={state.sukses ? "kotak-sukses" : "kotak-galat"}
            >
              {state.pesan}
            </p>
          )}

          <button
            type="submit"
            disabled={sedangSimpan}
            className="tombol-utama"
          >
            {sedangSimpan ? "Menyimpan..." : "Simpan voucher"}
          </button>
        </div>
      </form>

      {pesanUbah && (
        <p
          role="status"
          className="kotak-sukses"
        >
          {pesanUbah}
        </p>
      )}

      {/* Daftar voucher */}
      <div className="kartu overflow-hidden">
        <div className="px-5 py-4 border-b border-krem-gelap flex items-center justify-between">
          <h2 className="judul-bagian">Daftar voucher</h2>
          <span className="text-sm text-kayu-sedang">
            {daftar.length} voucher
          </span>
        </div>

        {daftar.length === 0 ? (
          <p className="p-6 teks-redup">
            Belum ada voucher. Buat satu di formulir atas.
          </p>
        ) : (
          <ul className="divide-y divide-krem-gelap">
            {daftar.map((v) => {
              const habis = v.kuota !== null && v.terpakai >= v.kuota;
              const kedaluwarsa = v.berakhirPada
                ? new Date(v.berakhirPada) < new Date()
                : false;

              return (
                <li
                  key={v.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-kayu">
                        {v.kode}
                      </span>

                      {!v.aktif && (
                        <span className="lencana bg-krem-tua text-kayu-sedang border-krem-gelap">
                          Nonaktif
                        </span>
                      )}
                      {v.aktif && kedaluwarsa && (
                        <span className="lencana bg-bahaya-lembut text-bahaya border-bahaya/20">
                          Kedaluwarsa
                        </span>
                      )}
                      {v.aktif && !kedaluwarsa && habis && (
                        <span className="lencana bg-kunyit-lembut text-kunyit-tua border-kunyit/30">
                          Kuota habis
                        </span>
                      )}
                      {v.aktif && !kedaluwarsa && !habis && (
                        <span className="lencana bg-daun-lembut text-daun-tua border-daun/20">
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
                      className="tombol-kedua tombol-kecil"
                    >
                      {v.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>

                    <button
                      type="button"
                      onClick={() => hapus(v)}
                      disabled={sedangUbah}
                      aria-label={`Hapus voucher ${v.kode}`}
                      className={`tombol tombol-kecil ${akanDihapus === v.id ? "bg-bahaya text-white" : "text-bahaya hover:bg-bahaya-lembut"}`}
                    >
                      {akanDihapus === v.id ? (v.terpakai > 0 ? "Nonaktifkan permanen?" : "Yakin hapus?") : "Hapus"}
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
