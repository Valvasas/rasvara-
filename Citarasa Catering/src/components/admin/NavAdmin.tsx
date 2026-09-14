"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TAUTAN = [
  { href: "/admin", label: "Papan Pesanan", ikon: "🍳", persis: true },
  { href: "/admin/menu", label: "Menu", ikon: "🍱", persis: false },
  { href: "/admin/keuangan", label: "Buku Kas", ikon: "💰", persis: false },
  { href: "/admin/laporan", label: "Laporan", ikon: "📊", persis: false },
  { href: "/admin/pengaturan", label: "Pengaturan", ikon: "⚙️", persis: false },
];

export function NavAdmin() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi Admin"
      className="flex items-center gap-1 sm:gap-2 overflow-x-auto gulir-tipis py-1 min-w-0"
    >
      {TAUTAN.map((t) => {
        const aktif = t.persis ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={aktif ? "page" : undefined}
            className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              aktif
                ? "bg-kunyit text-kayu shadow-sm"
                : "text-krem hover:bg-kayu-sedang hover:text-white"
            }`}
          >
            <span aria-hidden="true">{t.ikon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
