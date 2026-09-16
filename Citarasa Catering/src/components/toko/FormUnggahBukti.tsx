"use client";

import { useActionState, useState, useTransition, useRef, type ChangeEvent } from "react";
import { aksiUnggahBuktiBayar, aksiKonfirmasiBayar, type HasilAksiPesanan } from "@/app/aksi/pesanan";
import { IkonLampiran } from "@/components/ikon/Ikon";

interface FormUnggahBuktiProps {
  kode: string;
  buktiSaatIni?: string | null;
  statusBayar: string;
}

export function FormUnggahBukti({
  kode,
  buktiSaatIni,
  statusBayar,
}: FormUnggahBuktiProps) {
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [namaFile, setNamaFile] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, formAction, isPendingUpload] = useActionState<HasilAksiPesanan | null, FormData>(
    aksiUnggahBuktiBayar,
    null
  );

  const [isPendingKonfirmasi, startTransition] = useTransition();

  const handlePilihGambar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNamaFile(file.name);
      const url = URL.createObjectURL(file);
      setPratinjau(url);
    }
  };

  const handleBatalPilih = () => {
    setPratinjau(null);
    setNamaFile("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleKonfirmasiCepat = () => {
    startTransition(async () => {
      await aksiKonfirmasiBayar(kode);
    });
  };

  const isLunas = statusBayar === "LUNAS";
  const isMenungguVerifikasi = statusBayar === "MENUNGGU_VERIFIKASI";

  return (
    <div className="space-y-4">
      {/* Tampilan Bukti yang Sudah Ada */}
      {buktiSaatIni && (
        <div className="p-4 permukaan-kartu rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-kayu flex items-center gap-1.5">
              <IkonLampiran className="w-4 h-4" /> Bukti Transfer Terlampir
            </span>
            <a
              href={buktiSaatIni}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-bata hover:underline inline-flex items-center gap-1"
            >
              Lihat Foto Asli &rarr;
            </a>
          </div>

          <div className="relative w-full max-w-[200px] h-32 rounded-xl overflow-hidden border border-krem-gelap bg-krem/40">
            {/* Menggunakan img biasa agar kompatibel dengan file statis lokal tanpa optimasi domain */}
            <img
              src={buktiSaatIni}
              alt="Bukti Transfer Pembeli"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Form Upload Bukti */}
      {!isLunas && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="kode" value={kode} />

          {/* Feedback Hasil Aksi */}
          {state && !state.sukses && (
            <div className="p-3 bg-bahaya-lembut text-bahaya rounded-xl text-xs font-semibold border border-bahaya/20">
              {state.pesan}
            </div>
          )}

          {state && state.sukses && (
            <div className="p-3 bg-daun-lembut text-daun-tua rounded-xl text-xs font-semibold border border-daun/20">
              {state.pesan}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-kayu">
              Unggah Foto Struk / Tangkapan Layar Bukti Transfer:
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                name="berkas"
                id="berkas-bukti"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePilihGambar}
                className="hidden"
                disabled={isPendingUpload}
              />

              <label
                htmlFor="berkas-bukti"
                className="min-h-[48px] px-4 py-2.5 rounded-xl border-2 border-dashed border-bata/40 bg-bata-lembut/30 hover:bg-bata-lembut/50 text-bata font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{pratinjau ? "Ganti Foto Bukti" : "Pilih / Foto Struk Transfer"}</span>
              </label>

              {pratinjau && (
                <button
                  type="submit"
                  disabled={isPendingUpload}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-daun hover:bg-daun-tua disabled:opacity-50 transition-colors shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPendingUpload ? (
                    <span>Mengunggah...</span>
                  ) : (
                    <>
                      <span>Kirim Bukti Pembayaran</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {pratinjau && (
                <button
                  type="button"
                  onClick={handleBatalPilih}
                  disabled={isPendingUpload}
                  className="min-h-[48px] px-3 py-2 text-xs font-semibold text-kayu-sedang hover:text-bahaya transition-colors"
                >
                  Batal
                </button>
              )}
            </div>

            <p className="text-[11px] text-kayu-sedang">
              Format JPG, PNG, atau WebP. Ukuran berkas maksimal 5 MB.
            </p>
          </div>

          {/* Pratinjau Gambar Sebelum Unggah */}
          {pratinjau && (
            <div className="p-3 bg-white rounded-xl border border-krem-gelap flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-krem-gelap flex-shrink-0 bg-krem/40">
                <img
                  src={pratinjau}
                  alt="Pratinjau Bukti"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs overflow-hidden">
                <p className="font-bold text-kayu truncate">{namaFile}</p>
                <p className="text-[11px] text-daun font-semibold mt-0.5">
                  Foto siap diunggah. Klik tombol &quot;Kirim Bukti Pembayaran&quot;.
                </p>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Opsi Cepat: Sudah Transfer tapi belum/tidak ada foto */}
      {!isLunas && !isMenungguVerifikasi && !pratinjau && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleKonfirmasiCepat}
            disabled={isPendingKonfirmasi}
            className="text-xs font-semibold text-kayu-sedang hover:text-bata transition-colors underline cursor-pointer"
          >
            {isPendingKonfirmasi
              ? "Mengirim konfirmasi..."
              : "Sudah transfer lewat ATM/Tunai tapi tidak punya bukti foto? Klik konfirmasi di sini."}
          </button>
        </div>
      )}
    </div>
  );
}
