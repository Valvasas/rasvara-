"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import {
  IkonArsip,
  IkonDompet,
  IkonGrafik,
  IkonLaporan,
  IkonMangkuk,
  IkonPapan,
  IkonPengaturan,
  IkonTiket,
} from "@/components/ikon/Ikon";

const SEMUA_TAUTAN = [
  { href: "/admin", label: "Papan pesanan", Ikon: IkonPapan, persis: true, hanyaPemilik: false },
  { href: "/admin/pesanan", label: "Semua pesanan", Ikon: IkonArsip, persis: false, hanyaPemilik: false },
  { href: "/admin/menu", label: "Menu", Ikon: IkonMangkuk, persis: false, hanyaPemilik: true },
  { href: "/admin/keuangan", label: "Buku kas", Ikon: IkonDompet, persis: false, hanyaPemilik: true },
  { href: "/admin/laporan", label: "Laporan", Ikon: IkonLaporan, persis: false, hanyaPemilik: true },
  { href: "/admin/voucher", label: "Voucher", Ikon: IkonTiket, persis: false, hanyaPemilik: true },
  { href: "/admin/analitik", label: "Pengunjung", Ikon: IkonGrafik, persis: false, hanyaPemilik: true },
  { href: "/admin/pengaturan", label: "Pengaturan", Ikon: IkonPengaturan, persis: false, hanyaPemilik: true },
];

/**
 * Navigasi dashboard. Satu daftar tautan dipakai dua kali: sebagai sidebar
 * vertikal di layar lebar dan sebagai baris geser di ponsel.
 */
export function NavAdmin({ peran, arah }: { peran?: Peran; arah: "vertikal" | "horizontal" }) {
  const pathname = usePathname();
  const tautan = SEMUA_TAUTAN.filter((t) => (peran === "STAF_DAPUR" ? !t.hanyaPemilik : true));

  return (
    <nav aria-label="Navigasi dashboard">
      <ul className={arah === "vertikal" ? "space-y-0.5" : "flex gap-1 w-max"}>
        {tautan.map(({ href, label, Ikon, persis }) => {
          const aktif = persis ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={aktif ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  arah === "vertikal" ? "px-3 py-2.5" : "px-3 py-2"
                } ${
                  aktif
                    ? "bg-bata-lembut text-bata-tua"
                    : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
                }`}
              >
                <Ikon className="w-[18px] h-[18px] shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
