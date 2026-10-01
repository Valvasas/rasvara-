"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";
import { IkonPengguna } from "@/components/ikon/Ikon";

interface NavTokoProps {
  peran: Peran | null;
}

export function NavToko({ peran }: NavTokoProps) {
  const pathname = usePathname();
  const aktif = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const kelasTautan = (href: string) =>
    `inline-flex items-center min-h-[40px] px-2.5 sm:px-3 rounded-lg text-sm font-medium transition-colors ${
      aktif(href) ? "text-kayu bg-krem-tua" : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
    }`;

  const akun =
    peran === "PEMILIK" || peran === "STAF_DAPUR"
      ? { href: "/admin", label: "Dapur" }
      : peran
      ? { href: "/riwayat", label: "Pesanan saya" }
      : { href: "/masuk", label: "Masuk" };

  return (
    <nav aria-label="Navigasi utama" className="flex items-center gap-0.5 sm:gap-1">
      <Link href="/menu" aria-current={aktif("/menu") ? "page" : undefined} className={kelasTautan("/menu")}>
        Menu
      </Link>
      <Link href="/lacak" aria-current={aktif("/lacak") ? "page" : undefined} className={kelasTautan("/lacak")}>
        Lacak
      </Link>
      <Link
        href={akun.href}
        aria-current={aktif(akun.href) ? "page" : undefined}
        aria-label={akun.label}
        className={kelasTautan(akun.href)}
      >
        <IkonPengguna className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline">{akun.label}</span>
      </Link>
      <Link
        href="/pesan"
        aria-current={aktif("/pesan") ? "page" : undefined}
        className="tombol-utama tombol-kecil sm:min-h-[40px] sm:px-4 sm:text-sm ml-1"
      >
        Pesan
      </Link>
    </nav>
  );
}
