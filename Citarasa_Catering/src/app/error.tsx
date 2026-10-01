"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function TerjadiKesalahan({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
      <Wordmark href="/" />
      <h1 className="font-tampil mt-10 text-3xl font-bold text-kayu">Halaman gagal dimuat</h1>
      <p className="teks-redup mt-3 max-w-sm">
        Ada gangguan sesaat di server kami. Coba lagi sebentar. Data yang sudah kamu kirim tetap aman.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-kayu-sedang font-mono">Kode galat: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="tombol-utama">
          Coba lagi
        </button>
        <Link href="/" className="tombol-kedua">
          Beranda
        </Link>
      </div>
    </div>
  );
}
