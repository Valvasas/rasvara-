/**
 * Tanda merek Citarasa: piring dilihat dari atas, dengan sehelai daun emas
 * yang sekaligus menjadi jarum jam.
 *
 *   lingkaran piring  → hidangan, satu porsi utuh
 *   daun              → SEHAT, bahan segar
 *   warna emas        → MATANG, kerak keemasan masakan yang pas
 *   daun = jarum jam  → TEPAT WAKTU; tick di posisi 12 = presisi
 *
 * Sengaja hanya memakai elemen SVG dasar dengan warna literal (tanpa kelas
 * CSS) supaya bisa dirender juga oleh `ImageResponse` (favicon, ikon aplikasi,
 * gambar pratinjau WhatsApp) — satu gambar yang sama di semua tempat.
 */

export const WARNA_MEREK = {
  pandan: "#0D6B4E",
  pandanGelap: "#0A3A2C",
  kunyit: "#E8A33A",
  kunyitTerang: "#F6C86A",
  beras: "#F7F7F1",
  arang: "#17211C",
} as const;

interface TandaMerekProps {
  ukuran?: number;
  /**
   * "penuh" = ubin hijau (ikon aplikasi, kepala halaman);
   * "garis" = tanpa ubin, untuk latar gelap; "polos" = tanpa ubin, untuk latar terang.
   */
  varian?: "penuh" | "garis" | "polos";
  /** Jarum berdetak ke posisinya saat pertama tampil (lihat .anim-jarum). */
  beranimasi?: boolean;
  className?: string;
}

export function TandaMerek({ ukuran = 40, varian = "penuh", beranimasi = false, className }: TandaMerekProps) {
  const garis = varian === "polos" ? WARNA_MEREK.pandan : WARNA_MEREK.beras;
  return (
    <svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {varian === "penuh" && <rect width="40" height="40" rx="11" fill={WARNA_MEREK.pandan} />}
      {/* Piring */}
      <circle cx="20" cy="20" r="12.6" stroke={garis} strokeWidth="2.4" />
      {/* Tick pukul 12 — penanda presisi */}
      <path d="M20 9.6v2.9" stroke={WARNA_MEREK.kunyitTerang} strokeWidth="2.4" strokeLinecap="round" />
      {/* Daun = jarum jam, menunjuk ±pukul 2 */}
      <g className={beranimasi ? "anim-jarum" : undefined}>
        <path
          d="M20 20c.4-4.6 3.6-8.2 8.9-8.9-.5 5.3-4.2 8.6-8.9 8.9z"
          fill={WARNA_MEREK.kunyitTerang}
        />
        <path d="M20.6 19.4l6.4-6.4" stroke={WARNA_MEREK.pandanGelap} strokeWidth="1.1" strokeLinecap="round" />
      </g>
      {/* Poros jarum */}
      <circle cx="20" cy="20" r="2.1" fill={garis} />
    </svg>
  );
}
