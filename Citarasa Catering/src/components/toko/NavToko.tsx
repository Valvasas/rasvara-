"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Peran } from "@/generated/prisma/client";

interface NavTokoProps {
  peran: Peran | null;
}

export function NavToko({ peran }: NavTokoProps) {
  const pathname = usePathname();

  const tautanUtama = (href: string, aktifPersis = false) =>
    aktifPersis ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      aria-label="Navigasi Utama"
      className="flex items-center gap-1 sm:gap-2 overflow-x-auto gulir-tipis py-1"
    >
      <Link
        href="/menu"
        aria-current={tautanUtama("/menu") ? "page" : undefined}
        className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-colors inline-flex items-center ${
          tautanUtama("/menu")
            ? "text-bata bg-bata-lembut"
            : "text-kayu hover:text-bata hover:bg-krem-tua"
        }`}
      >
        Menu
      </Link>

      <Link
        href="/pesan"
        aria-current={tautanUtama("/pesan") ? "page" : undefined}
        className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-white bg-bata hover:bg-bata-tua transition-colors inline-flex items-center shadow-sm"
      >
        Pesan
      </Link>

      <Link
        href="/lacak"
        aria-current={tautanUtama("/lacak") ? "page" : undefined}
        className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors inline-flex items-center ${
          tautanUtama("/lacak")
            ? "text-bata bg-bata-lembut"
            : "text-kayu hover:text-bata hover:bg-krem-tua"
        }`}
      >
        Lacak
      </Link>

      {peran ? (
        peran === "PEMILIK" || peran === "STAF_DAPUR" ? (
          <Link
            href="/admin"
            className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-bold text-kunyit-tua bg-kunyit-lembut border border-kunyit/30 hover:bg-kunyit/20 transition-colors inline-flex items-center"
          >
            {peran === "STAF_DAPUR" ? "Papan Dapur" : "Dapur Admin"}
          </Link>
        ) : (
          <Link
            href="/riwayat"
            aria-current={tautanUtama("/riwayat") ? "page" : undefined}
            className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium border transition-colors inline-flex items-center ${
              tautanUtama("/riwayat")
                ? "text-bata bg-bata-lembut border-bata/30"
                : "text-kayu border-krem-gelap hover:bg-krem-tua"
            }`}
          >
            Pesanan Saya
          </Link>
        )
      ) : (
        <Link
          href="/masuk"
          aria-current={tautanUtama("/masuk") ? "page" : undefined}
          className={`min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors inline-flex items-center ${
            tautanUtama("/masuk")
              ? "text-bata bg-bata-lembut"
              : "text-kayu-sedang hover:text-kayu hover:bg-krem-tua"
          }`}
        >
          Masuk
        </Link>
      )}
    </nav>
  );
}
