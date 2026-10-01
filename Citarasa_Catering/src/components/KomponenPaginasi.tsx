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
    `min-h-[40px] min-w-[40px] px-3 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center angka-tabel ${
      nonaktif
        ? "opacity-40 pointer-events-none text-kayu-sedang"
        : aktif
        ? "bg-kayu text-white"
        : "text-kayu hover:bg-krem-tua"
    }`;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex items-center justify-center flex-wrap gap-1 pt-6"
    >
      <Link
        href={buatHref(basePath, Math.max(1, halamanAktif - 1), queryLain)}
        aria-disabled={halamanAktif === 1}
        className={kelasTombol(false, halamanAktif === 1)}
      >
        <span aria-hidden="true">&larr;</span><span className="hidden sm:inline ml-1">Sebelumnya</span>
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
        <span className="hidden sm:inline mr-1">Berikutnya</span><span aria-hidden="true">&rarr;</span>
      </Link>
    </nav>
  );
}
