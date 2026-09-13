import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Lencana, Titik } from "@/components/Lencana";
import { bacaSesi } from "@/lib/auth";
import { ambilPengaturan } from "@/lib/pengaturan";
import { jamTampil, sedangBuka } from "@/lib/format";

const TAUTAN = [
  { href: "/menu", label: "Menu" },
  { href: "/#cerita", label: "Cerita Kami" },
  { href: "/lacak", label: "Lacak Pesanan" },
];

export async function KopToko() {
  const [pengaturan, sesi] = await Promise.all([ambilPengaturan(), bacaSesi()]);
  const buka = sedangBuka(pengaturan.jamBuka, pengaturan.jamTutup);

  return (
    <header className="tanpa-cetak sticky top-0 z-40 border-b border-krem-tua bg-krem/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Wordmark />

        {/* Tidak memakai menu tersembunyi di balik ikon tiga garis: pengunjung
            yang tidak terbiasa sering tidak sadar ikon itu bisa ditekan. */}
        <nav
          aria-label="Menu utama"
          className="hidden items-center gap-1 md:flex"
        >
          {TAUTAN.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-lg px-3 py-2 font-medium text-arang-muda transition-colors hover:bg-kayu-lembut hover:text-arang"
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Lencana
            kelas={
              buka
                ? "bg-daun-lembut text-daun-tua border-daun/40 hidden sm:inline-flex"
                : "bg-krem-tua text-arang-muda border-kayu/25 hidden sm:inline-flex"
            }
          >
            <Titik kelas={buka ? "bg-daun" : "bg-arang-muda"} />
            {buka
              ? "Buka sekarang"
              : `Tutup, buka ${jamTampil(pengaturan.jamBuka)}`}
          </Lencana>

          {sesi?.peran === "PEMILIK" ? (
            <Link href="/admin" className="tombol tombol-kedua">
              Halaman Pemilik
            </Link>
          ) : sesi ? (
            <Link href="/riwayat" className="tombol tombol-kedua">
              Pesanan Saya
            </Link>
          ) : null}

          <Link href="/pesan" className="tombol tombol-utama">
            Pesan
          </Link>
        </div>
      </div>

      <nav
        aria-label="Menu utama versi ringkas"
        className="flex gap-1 overflow-x-auto border-t border-krem-tua px-4 py-2 md:hidden"
      >
        {TAUTAN.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="shrink-0 rounded-lg px-3 py-2 text-[0.95rem] font-medium text-arang-muda"
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
