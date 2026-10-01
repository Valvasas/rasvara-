"use client";

import { useActionState, useEffect, useState, useTransition, useRef, type ChangeEvent } from "react";
import { aksiUnggahBuktiBayar, aksiKonfirmasiBayar, type HasilAksiPesanan } from "@/app/aksi/pesanan";
import { IkonFoto, IkonLampiran } from "@/components/ikon/Ikon";

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

  // Setelah unggahan berhasil, pratinjau dibersihkan supaya tombol "Kirim"
  // tidak tetap muncul dan membuat pembeli mengira unggahannya belum masuk.
  useEffect(() => {
    if (!state?.sukses) return;
    setPratinjau(null);
    setNamaFile("");
    if (inputRef.current) inputRef.current.value = "";
  }, [state]);

  const handleKonfirmasiCepat = () => {
    startTransition(async () => {
      await aksiKonfirmasiBayar(kode);
    });
  };

  const isLunas = statusBayar === "LUNAS";
  const isMenungguVerifikasi = statusBayar === "MENUNGGU_VERIFIKASI";

  return (
    <div className="space-y-4">
      {buktiSaatIni && (
        <div className="flex items-center gap-3">
          <a
            href={buktiSaatIni}
            target="_blank"
            rel="noopener noreferrer"
            className="relative w-16 h-16 rounded-lg overflow-hidden border border-krem-gelap bg-krem-tua shrink-0"
          >
            {/* img biasa: berkas dilayani route berizin, bukan aset statis */}
            <img src={buktiSaatIni} alt="Bukti transfer yang terkirim" className="w-full h-full object-cover" />
          </a>
          <div className="text-sm">
            <p className="font-medium text-kayu flex items-center gap-1.5">
              <IkonLampiran className="w-4 h-4" /> Bukti transfer terkirim
            </p>
            <p className="text-kayu-sedang">
              {isLunas ? "Pembayaran sudah dikonfirmasi." : "Menunggu dicek dapur."}
            </p>
          </div>
        </div>
      )}

      {!isLunas && (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="kode" value={kode} />

          {state && (
            <div role={state.sukses ? "status" : "alert"} className={state.sukses ? "kotak-sukses" : "kotak-galat"}>
              {state.pesan}
            </div>
          )}

          <p className="label mb-0">{buktiSaatIni ? "Ganti bukti transfer" : "Sudah transfer? Kirim buktinya"}</p>

          <input
            ref={inputRef}
            type="file"
            name="berkas"
            id="berkas-bukti"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePilihGambar}
            className="sr-only"
            disabled={isPendingUpload}
          />

          {pratinjau ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-krem-gelap p-3">
              <img src={pratinjau} alt="Pratinjau bukti" className="w-14 h-14 rounded-lg object-cover border border-krem-gelap" />
              <p className="flex-1 min-w-0 text-sm text-kayu truncate">{namaFile}</p>
              <div className="flex gap-2">
                <button type="button" onClick={handleBatalPilih} disabled={isPendingUpload} className="tombol-hantu tombol-kecil">
                  Batal
                </button>
                <button type="submit" disabled={isPendingUpload} className="tombol-utama tombol-kecil">
                  {isPendingUpload ? "Mengunggah..." : "Kirim bukti"}
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="berkas-bukti"
              className="flex items-center justify-center gap-2 min-h-[52px] rounded-xl border border-dashed border-kayu-sedang/40 text-sm font-medium text-kayu hover:bg-krem-tua cursor-pointer transition-colors has-[:focus-visible]:ring-2"
            >
              <IkonFoto className="w-5 h-5 text-kayu-sedang" />
              Pilih foto / screenshot
            </label>
          )}
          <p className="petunjuk mt-0">JPG, PNG, atau WebP, maksimal 5 MB.</p>
        </form>
      )}

      {!isLunas && !isMenungguVerifikasi && !pratinjau && !buktiSaatIni && (
        <button
          type="button"
          onClick={handleKonfirmasiCepat}
          disabled={isPendingKonfirmasi}
          className="text-sm text-kayu-sedang hover:text-kayu underline underline-offset-2 cursor-pointer"
        >
          {isPendingKonfirmasi ? "Mengirim konfirmasi..." : "Sudah transfer tapi tidak punya fotonya? Konfirmasi tanpa bukti"}
        </button>
      )}
    </div>
  );
}
