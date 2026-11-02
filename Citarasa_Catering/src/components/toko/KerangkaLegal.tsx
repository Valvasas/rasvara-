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
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div className="space-y-3">
        <div className="text-xs text-arang-sedang flex items-center gap-1.5">
          <Link href="/" className="hover:text-pandan font-medium">
            Beranda
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-arang font-semibold">{judul}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-arang font-tampil">
          {judul}
        </h1>

        <p className="text-sm text-arang-sedang">
          Terakhir diperbarui: {diperbaruiPada}
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-beras-tua border border-beras-gelap">
        <p className="text-sm text-arang leading-relaxed">
          <strong className="font-semibold">Ringkasnya:</strong> {ringkasan}
        </p>
      </div>

      <div className="space-y-7 text-arang leading-relaxed">{children}</div>

      <div className="pt-6 border-t border-beras-gelap flex flex-wrap gap-3 text-sm">
        <Link
          href="/kebijakan-privasi"
          className="font-medium text-pandan hover:underline"
        >
          Kebijakan Privasi
        </Link>
        <span className="text-beras-gelap" aria-hidden="true">
          |
        </span>
        <Link
          href="/syarat-ketentuan"
          className="font-medium text-pandan hover:underline"
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
      <h2 className="text-xl font-semibold text-arang">{judul}</h2>
      <div className="space-y-3 text-[15px] text-arang-sedang leading-relaxed">
        {children}
      </div>
    </section>
  );
}
