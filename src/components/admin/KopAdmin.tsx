"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { TombolKeluar } from "@/components/TombolKeluar";

const TAUTAN = [
  { href: "/admin", label: "Beranda" },
  { href: "/admin/pesanan", label: "Pesanan" },
  { href: "/admin/keuangan", label: "Uang" },
  { href: "/admin/laporan", label: "Laporan" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/pengaturan", label: "Pengaturan" },
];

export function KopAdmin({
  nama,
  pesananBaru = 0,
}: {
  nama: string;
  pesananBaru?: number;
}) {
  const jalur = usePathname();

  return (
    <header className="tanpa-cetak sticky top-0 z-40 bg-kayu-tua text-krem shadow-hangat">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Wordmark href="/admin" terang />
          <span className="hidden rounded-full bg-krem/15 px-3 py-1 text-[0.75rem] font-bold tracking-[0.15em] uppercase sm:inline">
            Halaman Pemilik
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[0.9rem] text-krem/75 sm:inline">
            {nama}
          </span>
          <Link
            href="/"
            className="tombol border-2 border-krem/30 bg-transparent px-4 py-2 text-krem hover:bg-white/10"
          >
            Lihat Website
          </Link>
          <TombolKeluar kelas="tombol border-2 border-krem/30 bg-transparent px-4 py-2 text-krem hover:bg-white/10" />
        </div>
      </div>

      <nav
        aria-label="Menu halaman pemilik"
        className="border-t border-krem/15"
      >
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-1.5">
          {TAUTAN.map((t) => {
            const aktif =
              t.href === "/admin" ? jalur === "/admin" : jalur.startsWith(t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={aktif ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors ${
                    aktif
                      ? "bg-krem text-kayu-tua"
                      : "text-krem/80 hover:bg-white/10 hover:text-krem"
                  }`}
                >
                  {t.label}
                  {t.href === "/admin/pesanan" && pesananBaru > 0 ? (
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.78rem] font-bold ${
                        aktif ? "bg-bata text-white" : "bg-bata text-white"
                      }`}
                    >
                      {pesananBaru}
                      <span className="khusus-pembaca-layar">
                        {" "}
                        pesanan baru menunggu
                      </span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
