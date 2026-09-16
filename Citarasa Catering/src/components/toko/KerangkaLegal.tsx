import Link from "next/link";
import type { ReactNode } from "react";

interface KerangkaLegalProps {
  judul: string;
  ringkasan: string;
  diperbaruiPada: string;
  children: ReactNode;
}

/**
 * Kerangka bersama untuk halaman kebijakan. Dokumen hukum tetap harus enak
 * dibaca di HP: lebar baris dibatasi, ukuran huruf tidak dikecilkan, dan ada
 * ringkasan bahasa manusia di atas sebelum rinciannya.
 */
export function KerangkaLegal({
  judul,
  ringkasan,
  diperbaruiPada,
  children,
}: KerangkaLegalProps) {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      <div className="space-y-3">
        <div className="text-xs text-kayu-sedang flex items-center gap-1.5">
          <Link href="/" className="hover:text-bata font-medium">
            Beranda
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-kayu font-semibold">{judul}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-kayu font-display">
          {judul}
        </h1>

        <p className="text-sm text-kayu-sedang">
          Terakhir diperbarui: {diperbaruiPada}
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-kunyit-lembut border border-kunyit/30">
        <p className="text-sm text-kayu leading-relaxed">
          <strong className="font-extrabold">Ringkasnya:</strong> {ringkasan}
        </p>
      </div>

      <div className="space-y-7 text-kayu leading-relaxed">{children}</div>

      <div className="pt-6 border-t border-krem-gelap flex flex-wrap gap-3 text-sm">
        <Link
          href="/kebijakan-privasi"
          className="font-bold text-bata hover:underline"
        >
          Kebijakan Privasi
        </Link>
        <span className="text-krem-gelap" aria-hidden="true">
          |
        </span>
        <Link
          href="/syarat-ketentuan"
          className="font-bold text-bata hover:underline"
        >
          Syarat &amp; Ketentuan
        </Link>
      </div>
    </div>
  );
}

export function SeksiLegal({
  judul,
  children,
}: {
  judul: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-extrabold text-kayu font-display">{judul}</h2>
      <div className="space-y-3 text-[15px] text-kayu-sedang leading-relaxed">
        {children}
      </div>
    </section>
  );
}
