"use client";

import { useEffect, useState, useTransition } from "react";
import { aksiCatatPembayaran, aksiCatatRefund } from "@/app/aksi/pembayaran";
import { rupiah } from "@/lib/format";

interface CatatPembayaranProps {
  kode: string;
  /** Jumlah yang disarankan (kekurangan DP, atau sisa). */
  saran: number;
  /** Batas atas: sisa tagihan, atau uang diterima untuk refund. */
  maks: number;
  metodeAwal: "TRANSFER" | "TUNAI";
  refund?: boolean;
}

/**
 * Mencatat uang masuk (DP/pelunasan) atau pengembalian dana. Dua langkah di
 * tempat: isi jumlah → "Catat" → konfirmasi nominal. Uang yang salah catat
 * merusak laporan, jadi nominalnya selalu ditampilkan sebelum disimpan.
 */
export function CatatPembayaran({ kode, saran, maks, metodeAwal, refund = false }: CatatPembayaranProps) {
  const [jumlah, setJumlah] = useState(String(saran));
  const [metode, setMetode] = useState(metodeAwal);
  const [catatan, setCatatan] = useState("");
  const [yakin, setYakin] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Setelah tersimpan, halaman memuat ulang dengan sisa baru — ikuti sarannya.
  useEffect(() => {
    setJumlah(String(saran));
    setYakin(false);
  }, [saran]);

  const n = Math.floor(Number(jumlah));
  const valid = Number.isFinite(n) && n > 0 && n <= maks;
  const label = refund ? "pengembalian" : n >= maks ? "pelunasan" : "DP";

  const simpan = () => {
    if (!yakin) {
      setYakin(true);
      return;
    }
    setPesan(null);
    startTransition(async () => {
      try {
        const aksi = refund ? aksiCatatRefund : aksiCatatPembayaran;
        const hasil = await aksi({ kode, jumlah: n, metode, catatan: catatan || undefined });
        setPesan({ teks: hasil.pesan ?? (hasil.sukses ? "Tersimpan." : "Gagal."), ok: hasil.sukses });
        if (hasil.sukses) setCatatan("");
      } catch {
        setPesan({ teks: "Sesi berakhir atau koneksi terputus. Muat ulang halaman.", ok: false });
      }
      setYakin(false);
    });
  };

  const idj = `jumlah-${refund ? "refund" : "bayar"}-${kode}`;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label htmlFor={idj} className="label">{refund ? "Jumlah dikembalikan" : "Jumlah diterima"}</label>
          <input
            id={idj}
            type="number"
            inputMode="numeric"
            min={1}
            max={maks}
            value={jumlah}
            onChange={(e) => {
              setJumlah(e.target.value);
              setYakin(false);
            }}
            className={`isian angka-tabel ${jumlah && !valid ? "isian-galat" : ""}`}
          />
        </div>
        <div>
          <label htmlFor={`${idj}-metode`} className="label">Lewat</label>
          <select id={`${idj}-metode`} value={metode} onChange={(e) => setMetode(e.target.value as "TRANSFER" | "TUNAI")} className="isian">
            <option value="TRANSFER">Transfer</option>
            <option value="TUNAI">Tunai</option>
          </select>
        </div>
      </div>
      {jumlah && !valid && <p className="pesan-galat mt-0">Maksimal {rupiah(maks)}.</p>}
      <input
        type="text"
        aria-label="Catatan pembayaran (opsional)"
        placeholder="Catatan (opsional)"
        maxLength={200}
        value={catatan}
        onChange={(e) => setCatatan(e.target.value)}
        className="isian"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!valid || isPending}
          onClick={simpan}
          className={`${refund ? "tombol bg-bahaya text-white hover:bg-bahaya/90" : yakin ? "tombol-sukses" : "tombol-utama"} flex-1`}
        >
          {isPending ? "Menyimpan..." : yakin ? `Ya, catat ${label} ${rupiah(n)}` : `Catat ${label}`}
        </button>
        {yakin && !isPending && (
          <button type="button" onClick={() => setYakin(false)} className="tombol-hantu">Batal</button>
        )}
      </div>
      {pesan && (
        <p role={pesan.ok ? "status" : "alert"} className={pesan.ok ? "kotak-sukses" : "kotak-galat"}>
          {pesan.teks}
        </p>
      )}
    </div>
  );
}
