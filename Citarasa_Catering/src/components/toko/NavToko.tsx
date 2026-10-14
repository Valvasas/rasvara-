"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import { IkonKeranjang } from "@/components/ikon/Ikon";

interface NavTokoProps {
  peran: Peran | null;
  className?: string;
}

/** Navigasi kepala halaman untuk tablet & desktop (≥ 640px). */
export function NavToko({ peran, className = "" }: NavTokoProps) {
  const pathname = usePathname();
  const aktif = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const kelasTautan = (href: string) =>
    `relative inline-flex items-center min-h-[40px] px-3 rounded-lg text-sm font-medium transition-colors ${
      aktif(href)
        ? "text-kayu after:absolute after:left-3 after:right-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-bata"
        : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
    }`;

  const akun =
    peran === "PEMILIK" || peran === "STAF_DAPUR"
      ? { href: "/admin", label: "Dapur" }
      : peran
      ? { href: "/riwayat", label: "Pesanan saya" }
      : { href: "/masuk", label: "Masuk" };

  return (
    <nav aria-label="Navigasi utama" className={`items-center gap-1 ${className}`}>
      <Link href="/menu" aria-current={aktif("/menu") ? "page" : undefined} className={kelasTautan("/menu")}>
        Menu
      </Link>
      <Link href="/lacak" aria-current={aktif("/lacak") ? "page" : undefined} className={kelasTautan("/lacak")}>
        Lacak pesanan
      </Link>
      <Link href={akun.href} aria-current={aktif(akun.href) ? "page" : undefined} className={kelasTautan(akun.href)}>
        {akun.label}
      </Link>
      <Link
        href="/pesan"
        aria-current={aktif("/pesan") ? "page" : undefined}
        className="tombol-utama min-h-[40px] px-4 ml-2"
      >
        <IkonKeranjang className="w-4 h-4" strokeWidth={2} />
        Pesan
      </Link>
    </nav>
  );
}
