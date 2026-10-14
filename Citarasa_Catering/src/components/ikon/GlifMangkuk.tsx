/**
 * Logo Citarasa: mangkuk beruap. Satu sumber jalur untuk Wordmark (di halaman),
 * favicon, ikon layar utama, ikon PWA, dan gambar pratinjau Open Graph, supaya
 * logo yang dilihat pembeli di tab browser, layar HP, dan pratinjau WhatsApp
 * selalu sama dengan yang ada di situs.
 *
 * Hanya memakai atribut SVG biasa (tanpa className/CSS variable) sehingga juga
 * bisa dirender oleh next/og (satori), yang tidak membaca stylesheet.
 */
export const JALUR_MANGKUK = [
  "M7 4c.5 1 1 2 0 3",
  "M12 2c.7 1.5 1.4 3 0 4.5",
  "M17 4c.5 1 1 2 0 3",
  "M3 11h18c0 5-3.5 8-9 8s-9-3-9-8z",
  "M2 11h20",
] as const;

interface GlifMangkukProps {
  ukuran: number;
  warna: string;
  className?: string;
}

export function GlifMangkuk({ ukuran, warna, className }: GlifMangkukProps) {
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warna}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {JALUR_MANGKUK.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
