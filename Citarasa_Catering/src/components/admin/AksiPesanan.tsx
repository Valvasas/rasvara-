"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { aksiBatalkanPesanan, aksiPindahStatus, aksiTandaiLunas } from "@/app/aksi/pesanan";
import { INFO_STATUS } from "@/lib/pesanan";
import { rupiah } from "@/lib/format";
import { IkonCetak } from "@/components/ikon/Ikon";
import type { StatusBayar, StatusPesanan } from "@/generated/prisma/client";

interface AksiPesananProps {
  kode: string;
  status: StatusPesanan;
  statusBayar: StatusBayar;
  total: number;
  /** Sisa tagihan; setelah DP, "lunas" berarti mencatat sisa ini saja. */
  sisa: number;
  adalahPemilik: boolean;
}

type Mode = "normal" | "konfirmasi-lunas" | "batal";

/**
 * Semua aksi pada satu kartu pesanan di papan dapur.
 *
 * Konfirmasi dilakukan di dalam kartu, bukan lewat `confirm()`/`alert()`
 * bawaan peramban: dialog itu memblokir seluruh halaman, tidak bisa diberi
 * gaya, dan di beberapa peramban ponsel diam-diam ditekan otomatis.
 */
export function AksiPesanan({ kode, status, statusBayar, total, sisa, adalahPemilik }: AksiPesananProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("normal");
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const lunas = statusBayar === "LUNAS";
  const infoStatus = INFO_STATUS[status];
  const perluLunasDulu = infoStatus.statusLanjut === "SELESAI" && !lunas;

  function jalankan(aksi: () => Promise<{ sukses: boolean; pesan?: string }>, setelah?: () => void) {
    setGalat(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const hasil = await aksi();
        if (!hasil.sukses) {
          setGalat(hasil.pesan ?? "Aksi gagal. Coba lagi.");
          return;
        }
        if (hasil.pesan) setInfo(hasil.pesan);
        setMode("normal");
        setelah?.();
      } catch {
        // Server action melempar bila sesi sudah habis atau peran dicabut.
        setGalat("Sesi Anda berakhir atau koneksi terputus. Muat ulang halaman lalu masuk lagi.");
      }
    });
  }

  if (mode === "konfirmasi-lunas") {
    return (
      <div className="rounded-xl bg-daun-lembut p-3 space-y-2.5">
        <p className="text-sm text-daun-tua">
          {sisa < total ? "Lunasi sisa" : "Tandai lunas"}? <span className="font-semibold">{rupiah(sisa)}</span> akan dicatat di Buku Kas.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => jalankan(() => aksiTandaiLunas(kode))}
            className="tombol-sukses tombol-kecil flex-1"
          >
            {isPending ? "Mencatat..." : "Ya, lunas"}
          </button>
          <button type="button" disabled={isPending} onClick={() => setMode("normal")} className="tombol-hantu tombol-kecil">
            Batal
          </button>
        </div>
        {galat && <p role="alert" className="pesan-galat mt-0">{galat}</p>}
      </div>
    );
  }

  if (mode === "batal") {
    const idAlasan = `alasan-batal-${kode}`;
    return (
      <div className="rounded-xl bg-bahaya-lembut p-3 space-y-2.5">
        <label htmlFor={idAlasan} className="block text-sm font-medium text-bahaya">
          Alasan pembatalan (dilihat pemesan)
        </label>
        <input
          id={idAlasan}
          type="text"
          value={alasan}
          maxLength={200}
          autoFocus
          onChange={(e) => setAlasan(e.target.value)}
          placeholder="Mis. pemesan membatalkan lewat WA"
          className="isian min-h-[40px]"
        />
        {lunas && (
          <p className="text-xs text-bahaya">
            Pesanan ini sudah lunas. Setelah dibatalkan, catat pengembalian dana sebagai pengeluaran di Buku Kas.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending || alasan.trim().length < 3}
            onClick={() => jalankan(() => aksiBatalkanPesanan(kode, alasan), () => setAlasan(""))}
            className="tombol tombol-kecil flex-1 bg-bahaya text-white hover:bg-bahaya/90"
          >
            {isPending ? "Membatalkan..." : "Batalkan pesanan"}
          </button>
          <button type="button" disabled={isPending} onClick={() => setMode("normal")} className="tombol-hantu tombol-kecil">
            Kembali
          </button>
        </div>
        {galat && <p role="alert" className="pesan-galat mt-0">{galat}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {perluLunasDulu ? (
        adalahPemilik ? (
          <button type="button" disabled={isPending} onClick={() => setMode("konfirmasi-lunas")} className="tombol-sukses w-full">
            {sisa < total ? `Lunasi sisa ${rupiah(sisa)}` : "Tandai lunas"}
          </button>
        ) : (
          <p className="rounded-xl bg-kunyit-lembut px-3 py-2.5 text-sm text-kunyit-tua text-center">
            Menunggu pelunasan oleh pemilik
          </p>
        )
      ) : (
        infoStatus.aksiLanjut &&
        infoStatus.statusLanjut && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => jalankan(() => aksiPindahStatus(kode, infoStatus.statusLanjut!))}
            className={`${status === "SIAP" ? "tombol-sukses" : "tombol-utama"} w-full`}
          >
            {isPending ? "Memperbarui..." : infoStatus.aksiLanjut}
          </button>
        )
      )}

      <div className="flex items-center gap-1 -mx-1">
        {adalahPemilik && !lunas && !perluLunasDulu && (
          <button type="button" disabled={isPending} onClick={() => setMode("konfirmasi-lunas")} className="tombol-hantu tombol-kecil px-2">
            Tandai lunas
          </button>
        )}
        <Link
          href={`/admin/pesanan/${kode}/cetak`}
          target="_blank"
          rel="noopener noreferrer"
          className="tombol-hantu tombol-kecil px-2"
          aria-label={`Cetak pesanan ${kode}`}
        >
          <IkonCetak className="w-4 h-4" />
          Cetak
        </Link>
        {(adalahPemilik || !lunas) && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setMode("batal")}
            className="tombol-hantu tombol-kecil px-2 ml-auto hover:text-bahaya"
          >
            Batalkan
          </button>
        )}
      </div>

      {galat && <p role="alert" className="pesan-galat mt-0">{galat}</p>}
      {info && <p role="status" className="text-xs text-kunyit-tua">{info}</p>}
    </div>
  );
}
