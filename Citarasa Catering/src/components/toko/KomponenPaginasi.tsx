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

const SEKITAR = 1;

/** Nomor halaman yang layak ditampilkan; `null` berarti jeda "…". */
function susunNomor(aktif: number, total: number): (number | null)[] {
  const dipakai = new Set<number>([1, total]);
  for (let n = aktif - SEKITAR; n <= aktif + SEKITAR; n++) {
    if (n >= 1 && n <= total) dipakai.add(n);
  }

  const urut = [...dipakai].sort((a, b) => a - b);
  const hasil: (number | null)[] = [];
  let sebelumnya = 0;
  for (const n of urut) {
    if (sebelumnya && n - sebelumnya > 1) hasil.push(null);
    hasil.push(n);
    sebelumnya = n;
  }
  return hasil;
}

/** Pills gaya sama seperti filter kategori, otomatis kosong kalau cuma 1 halaman. */
export function KomponenPaginasi({
  halamanAktif,
  totalHalaman,
  basePath,
  queryLain,
}: KomponenPaginasiProps) {
  if (totalHalaman <= 1) return null;

  // Menampilkan semua nomor membuat barisnya ikut memanjang seiring katalog
  // bertambah; yang berguna hanya beberapa halaman di sekitar posisi sekarang,
  // ditambah halaman pertama dan terakhir sebagai jangkar.
  const nomorHalaman = susunNomor(halamanAktif, totalHalaman);

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

      {nomorHalaman.map((n, i) =>
        n === null ? (
          <span
            key={`jeda-${i}`}
            aria-hidden="true"
            className="px-1 text-sm text-kayu-sedang select-none"
          >
            &hellip;
          </span>
        ) : (
          <Link
            key={n}
            href={buatHref(basePath, n, queryLain)}
            aria-current={n === halamanAktif ? "page" : undefined}
            className={kelasTombol(n === halamanAktif)}
          >
            {n}
          </Link>
        )
      )}

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
