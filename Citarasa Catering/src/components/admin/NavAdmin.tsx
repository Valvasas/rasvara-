"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Peran } from "@/generated/prisma/client";

const SEMUA_TAUTAN = [
  { href: "/admin", label: "Papan Pesanan", ikon: "🍳", persis: true, hanyaPemilik: false },
  { href: "/admin/menu", label: "Menu", ikon: "🍱", persis: false, hanyaPemilik: true },
  { href: "/admin/keuangan", label: "Buku Kas", ikon: "💰", persis: false, hanyaPemilik: true },
  { href: "/admin/voucher", label: "Voucher", ikon: "🎟️", persis: false, hanyaPemilik: true },
  { href: "/admin/laporan", label: "Laporan", ikon: "📊", persis: false, hanyaPemilik: true },
  { href: "/admin/analitik", label: "Performa", ikon: "📈", persis: false, hanyaPemilik: true },
  { href: "/admin/pengaturan", label: "Pengaturan", ikon: "⚙️", persis: false, hanyaPemilik: true },
];

export function NavAdmin({ peran }: { peran?: Peran }) {
  const pathname = usePathname();
  const tautanAktif = SEMUA_TAUTAN.filter((t) => (peran === "STAF_DAPUR" ? !t.hanyaPemilik : true));

  return (
    <nav
      aria-label="Navigasi Admin"
      className="flex items-center gap-1 sm:gap-2 overflow-x-auto gulir-tipis py-1 min-w-0"
    >
      {tautanAktif.map((t) => {
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
