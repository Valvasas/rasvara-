"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { IkonPeringatan } from "@/components/ikon/Ikon";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center bg-krem">
      <div className="anim-masuk space-y-6 max-w-md">
        <div className="mb-2">
          <Wordmark href="/" tagline={false} className="justify-center" />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-bahaya-lembut text-bahaya mx-auto flex items-center justify-center">
          <IkonPeringatan className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-tampil text-2xl md:text-3xl font-bold text-kayu">
            Ada yang Kurang Sedap
          </h1>
          <p className="text-sm text-kayu-sedang leading-relaxed">
            Halaman ini mengalami gangguan sesaat. Coba muat ulang, atau
            kembali ke beranda dan hubungi kami lewat WhatsApp jika masalah
            berlanjut.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            Coba Lagi
          </button>
          <Link
            href="/"
            className="min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-kayu bg-krem-tua hover:bg-krem-gelap border border-krem-gelap transition-colors inline-flex items-center justify-center"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
