"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { IlustrasiGalat } from "@/components/ilustrasi/Ilustrasi";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center permukaan-hangat">
      <Wordmark href="/" />
      <IlustrasiGalat className="mt-6 w-64 sm:w-72" />
      <h1 className="font-tampil mt-2 text-3xl font-bold text-kayu">Ups, dapur kami lagi berasap</h1>
      <p className="teks-redup mt-3 max-w-sm">
        Ada gangguan sesaat di server. Coba lagi sebentar — data yang sudah kamu kirim tetap aman, dan isi
        keranjangmu tidak hilang.
      </p>
      {error.digest && (
        <p className="mt-2 text-[13px] text-kayu-sedang font-mono">Kode galat: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 w-full max-w-xs sm:max-w-none">
        <button type="button" onClick={() => reset()} className="tombol-utama tombol-besar">
          Coba lagi
        </button>
        <Link href="/" className="tombol-kedua tombol-besar">
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
