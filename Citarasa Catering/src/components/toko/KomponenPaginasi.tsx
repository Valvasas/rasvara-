import Link from "next/link";

interface KomponenPaginasiProps {
  halamanAktif: number;
  totalHalaman: number;
  /** Base path (mis. "/menu") tanpa query string. */
  basePath: string;
  /** Query yang perlu dipertahankan selain "halaman", mis. { kategori: "SNACK" }. */
  queryLain?: Record<string, string | undefined>;
}

function buatHref(basePath: string, halaman: number, queryLain?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(queryLain ?? {})) {
    if (v) params.set(k, v);
  }
  if (halaman > 1) params.set("halaman", String(halaman));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Pills gaya sama seperti filter kategori, otomatis kosong kalau cuma 1 halaman. */
export function KomponenPaginasi({
  halamanAktif,
  totalHalaman,
  basePath,
  queryLain,
}: KomponenPaginasiProps) {
  if (totalHalaman <= 1) return null;

  const nomorHalaman = Array.from({ length: totalHalaman }, (_, i) => i + 1);

  const kelasTombol = (aktif: boolean, nonaktif = false) =>
    `min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors inline-flex items-center justify-center ${
      nonaktif
        ? "opacity-40 pointer-events-none bg-white text-kayu-sedang border border-krem-gelap"
        : aktif
        ? "bg-bata text-white shadow-sm"
        : "bg-white text-kayu border border-krem-gelap hover:bg-krem-tua"
    }`;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex items-center justify-center flex-wrap gap-2 pt-4"
    >
      <Link
        href={buatHref(basePath, Math.max(1, halamanAktif - 1), queryLain)}
        aria-disabled={halamanAktif === 1}
        className={kelasTombol(false, halamanAktif === 1)}
      >
        &larr; Sebelumnya
      </Link>

      {nomorHalaman.map((n) => (
        <Link
          key={n}
          href={buatHref(basePath, n, queryLain)}
          aria-current={n === halamanAktif ? "page" : undefined}
          className={kelasTombol(n === halamanAktif)}
        >
          {n}
        </Link>
      ))}

      <Link
        href={buatHref(basePath, Math.min(totalHalaman, halamanAktif + 1), queryLain)}
        aria-disabled={halamanAktif === totalHalaman}
        className={kelasTombol(false, halamanAktif === totalHalaman)}
      >
        Berikutnya &rarr;
      </Link>
    </nav>
  );
}
